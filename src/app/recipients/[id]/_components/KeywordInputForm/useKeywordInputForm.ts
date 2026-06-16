import { useState, useId, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import { saveDailyRecord } from '../../actions';

export type EventInput = {
  id: string;
  event: string;
  emotion: string;
  isCustomEmotion: boolean;
  action: string;
};

export function createEmptyEvent(id: string): EventInput {
  return {
    id,
    event: '',
    emotion: '',
    isCustomEmotion: false,
    action: '',
  };
}

export function useKeywordInputForm(recipientId: string, targetDate: string) {
  const initialEventId = useId();
  const [events, setEvents] = useState<EventInput[]>(() => [
    createEmptyEvent(initialEventId),
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState<{ cognition: string; behavior: string } | null>(null);

  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const addEvent = () => {
    const newId = crypto.randomUUID();
    setEvents((currentEvents) => [...currentEvents, createEmptyEvent(newId)]);
  };

  const removeEvent = (id: string) => {
    setEvents((currentEvents) => currentEvents.filter((event) => event.id !== id));
  };

  const updateEvent = (id: string, fields: Partial<EventInput>) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...fields } : e)));
  };

  const generateDraft = async () => {
    const validEvents = events.filter(({ event }) => event.trim());
    if (validEvents.length === 0 || isGenerating) return;

    const keywords = validEvents.map((ev, index) => {
      let text = `[사건 ${index + 1}]`;
      if (ev.event.trim()) text += `\n- 일어난 사건: ${ev.event.trim()}`;
      if (ev.emotion.trim()) text += `\n- 어르신의 감정 및 반응: ${ev.emotion.trim()}`;
      if (ev.action.trim()) text += `\n- 요양보호사의 조치: ${ev.action.trim()}`;
      return text;
    }).join('\n\n');

    setIsGenerating(true);
    setDraft({ cognition: '', behavior: '' });

    try {
      const res = await fetch('/api/generate-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords })
      });

      if (!res.ok) throw new Error(`Generation failed: ${res.status}`);
      if (!res.body) throw new Error('No body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let fullText = '';

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
    } catch {
      showError('생성 중 오류가 발생했습니다.');
      setDraft(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const [isSaving, startTransition] = useTransition();

  const saveDraft = () => {
    startTransition(async () => {
      try {
        if (!draft) throw new Error('No draft to save');
        await saveDailyRecord(recipientId, draft.cognition, draft.behavior, targetDate);
        showSuccess('성공적으로 저장되었습니다.');
        router.refresh();
      } catch {
        showError('저장에 실패했습니다.');
      }
    });
  };

  const discardDraft = () => setDraft(null);

  const hasRequiredEvent = events.some(({ event }) => event.trim().length > 0);

  return {
    events,
    addEvent,
    removeEvent,
    updateEvent,
    hasRequiredEvent,
    draft,
    setDraft,
    generateDraft,
    isGenerating,
    saveDraft,
    isSaving,
    discardDraft,
  };
}
