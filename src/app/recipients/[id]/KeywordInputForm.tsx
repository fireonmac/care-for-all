'use client';

import { useState } from 'react';
import { saveDailyRecord } from './actions';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/Textarea';
import { Loader2 } from 'lucide-react';

export function KeywordInputForm({ recipientId, targetDate, recipientName }: { recipientId: string, targetDate: string, recipientName: string }) {
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<{cognition: string; behavior: string} | null>(null);
  const router = useRouter();
  
  const todayStr = new Date().toISOString().split('T')[0];
  const isFuture = targetDate > todayStr;
  
  const [, month, day] = targetDate.split('-');
  
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywords.trim() || loading) return;
    
    setLoading(true);
    // 즉시 리뷰 화면으로 전환
    setDraft({ cognition: '', behavior: '' });
    
    try {
      const res = await fetch('/api/generate-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords })
      });

      if (!res.ok) {
        throw new Error(`Generation failed: ${res.status}`);
      }
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
      alert('생성 중 오류가 발생했습니다.');
      setDraft(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    await saveDailyRecord(recipientId, draft.cognition, draft.behavior, targetDate);
    setSaving(false);
    router.refresh();
  };

  if (draft) {
    return (
      <div>
        <div className="mb-8 flex items-center gap-4">
          <h2 className="text-3xl font-medium text-black tracking-tight">생성된 기록 검토</h2>
          {loading && <Loader2 className="h-6 w-6 text-surface-400 animate-spin" />}
        </div>
        
        <div className="flex flex-col gap-16 mb-16">
          <div className="flex flex-col relative">
            <h3 className="text-base font-medium text-black tracking-widest mb-6">인지 영역</h3>
            <Textarea
              className={`text-xl pb-12 min-h-[200px] transition-all duration-500 ${loading && !draft.cognition ? 'bg-surface-200 animate-pulse border-transparent text-surface-700' : ''}`}
              value={draft.cognition}
              placeholder={loading && !draft.cognition ? 'AI가 문맥을 파악하고 작성을 준비하고 있습니다...' : ''}
              readOnly={loading}
              maxLength={1000}
              onChange={(e) => setDraft({...draft, cognition: e.target.value})}
            />
            <span className="absolute bottom-4 right-6 text-sm text-surface-500 font-light tracking-widest">
              {draft.cognition.length}/1000
            </span>
          </div>
          
          <div className="flex flex-col relative">
            <h3 className="text-base font-medium text-black tracking-widest mb-6">행동 영역</h3>
            <Textarea
              className={`text-xl pb-12 min-h-[200px] transition-all duration-500 ${loading && !draft.behavior ? 'bg-surface-200 animate-pulse border-transparent text-surface-700' : ''}`}
              value={draft.behavior}
              placeholder={loading && !draft.behavior && draft.cognition ? '인지 영역 완료. 행동 영역 작성을 준비합니다...' : loading && !draft.behavior ? 'AI가 문맥을 파악하고 작성을 준비하고 있습니다...' : ''}
              readOnly={loading}
              maxLength={1000}
              onChange={(e) => setDraft({...draft, behavior: e.target.value})}
            />
            <span className="absolute bottom-4 right-6 text-sm text-surface-500 font-light tracking-widest">
              {draft.behavior.length}/1000
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-6 border-t border-surface-200 pt-8">
          <button
            onClick={() => setDraft(null)}
            disabled={loading}
            className="text-base font-medium tracking-widest text-surface-600 hover:text-black disabled:opacity-30"
          >
            다시 쓰기
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-10 py-4 bg-black text-white text-base font-medium tracking-widest rounded-lg hover:bg-surface-800 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '최종 저장'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-medium text-black tracking-tight">관찰 키워드 입력</h2>
      </div>
      <p className="text-surface-600 mb-12 text-xl font-medium leading-relaxed">
        일지에 들어가야할 핵심 단어가 포함된 짧은 문장들을 입력해주세요. <br /> 
        시스템이 주어진 문장들을 분석하여 전문적인 일지로 바꾸어줍니다.
      </p>
      
      <form onSubmit={handleGenerate} className="flex flex-col">
        <div className="relative w-full">
          <Textarea
            value={keywords}
            maxLength={1000}
            onChange={(e) => setKeywords(e.target.value)}
            disabled={isFuture}
            placeholder={`${parseInt(month)}월 ${parseInt(day)}일의 ${recipientName} 어르신에 대해 알려주세요.`}
            className="text-2xl pb-12 min-h-[300px]"
          />
          <span className="absolute bottom-6 right-6 text-base text-surface-500 font-light tracking-widest">
            {keywords.length}/1000
          </span>
        </div>
        <div className="flex justify-end mt-4">
          <button
            type="submit"
            disabled={loading || !keywords.trim() || isFuture}
            className="px-10 py-4 bg-black text-white text-base font-medium tracking-widest rounded-lg hover:bg-surface-800 disabled:opacity-30"
          >
            {loading ? '생성 중...' : '기록 초안 생성'}
          </button>
        </div>
      </form>
    </div>
  );
}
