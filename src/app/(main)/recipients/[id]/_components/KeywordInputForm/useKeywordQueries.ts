import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { saveDailyRecord } from '../../actions';
import { parseDailyRecord, type DailyRecordDraft } from '@/lib/daily-record';

// 1. API: Daily Record 저장 Mutation (React Query)
export const useSaveDailyRecordMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recipientId,
      cognition,
      behavior,
      targetDate,
    }: {
      recipientId: string;
      cognition: string;
      behavior: string;
      targetDate: string;
    }) => {
      await saveDailyRecord(recipientId, cognition, behavior, targetDate);
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries if necessary, though Server Actions also trigger revalidatePath.
      queryClient.invalidateQueries({ queryKey: ['dailyRecords', variables.recipientId] });
      queryClient.invalidateQueries({ queryKey: ['weeklyReport'] }); // Update weekly records dependency
    },
  });
};

// 2. API: AI 스트리밍 생성 로직 (React Query 대신 별도 훅)
export const useGenerateDailyDraft = (recipientId: string) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState<DailyRecordDraft | null>(null);

  const generateDraft = async (keywords: string) => {
    setIsGenerating(true);
    setDraft({ cognition: '', behavior: '' });

    try {
      const res = await fetch('/api/generate-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, recipientId }),
      });

      if (!res.ok) {
        const failure: unknown = await res.json().catch(() => null);
        const message = failure && typeof failure === 'object' && 'error' in failure && typeof failure.error === 'string'
          ? failure.error : '초안 생성 중 오류가 발생했습니다.';
        throw new Error(message);
      }
      if (!res.body) throw new Error('No body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let fullText = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          fullText += decoder.decode(value, { stream: true });

          let currentCognition = '';
          let currentBehavior = '';

          if (fullText.includes('[행동]')) {
            const [cognition, behavior = ''] = fullText.split('[행동]', 2);
            currentCognition = cognition.replace('[인지]', '').trim();
            currentBehavior = behavior.trim();
          } else {
            currentCognition = fullText.replace('[인지]', '').trim();
          }

          setDraft({ cognition: currentCognition, behavior: currentBehavior });
        }
        fullText += decoder.decode();
        setDraft(parseDailyRecord(fullText));
      } finally {
        // Cancel unfinished upstream work and release the reader on every exit.
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
    } catch (e) {
      setDraft(null);
      if (e instanceof TypeError || (e instanceof Error && ['TimeoutError', 'AbortError'].includes(e.name))) {
        throw new Error('기록 생성이 중간에 끊겼습니다. 입력한 내용은 그대로 있으니 다시 생성해주세요.');
      }
      throw e; // 컴포넌트에서 에러를 캐치해서 Toast 띄울 수 있도록 던짐
    } finally {
      setIsGenerating(false);
    }
  };

  return { generateDraft, draft, setDraft, isGenerating };
};
