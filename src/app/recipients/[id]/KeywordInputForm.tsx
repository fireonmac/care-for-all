'use client';

import { useState, useEffect, useRef } from 'react';
import { generateDraft, saveDailyRecord } from './actions';
import { useRouter } from 'next/navigation';

export function KeywordInputForm({ recipientId, targetDate }: { recipientId: string, targetDate: string }) {
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<{cognition: string; behavior: string} | null>(null);
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [targetDate]);
  
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywords.trim()) return;
    
    setLoading(true);
    try {
      const result = await generateDraft(keywords);
      setDraft(result);
    } catch (error) {
      alert('생성 중 오류가 발생했습니다.');
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
        <div className="mb-8">
          <h2 className="text-3xl font-medium text-black tracking-tight">생성된 기록 검토</h2>
        </div>
        
        <div className="flex flex-col gap-16 mb-16">
          <div className="flex flex-col relative">
            <h3 className="text-base font-medium text-black tracking-widest mb-6">인지 영역</h3>
            <textarea
              className="w-full bg-surface-100 rounded-lg p-6 pb-12 focus:ring-2 focus:ring-black focus:outline-none text-surface-900 text-xl font-light leading-[1.8] resize-none min-h-[200px]"
              value={draft.cognition}
              maxLength={1000}
              onChange={(e) => setDraft({...draft, cognition: e.target.value})}
            />
            <span className="absolute bottom-4 right-6 text-sm text-surface-400 font-light tracking-widest">
              {draft.cognition.length}/1000
            </span>
          </div>
          
          <div className="flex flex-col relative">
            <h3 className="text-base font-medium text-black tracking-widest mb-6">행동 영역</h3>
            <textarea
              className="w-full bg-surface-100 rounded-lg p-6 pb-12 focus:ring-2 focus:ring-black focus:outline-none text-surface-900 text-xl font-light leading-[1.8] resize-none min-h-[200px]"
              value={draft.behavior}
              maxLength={1000}
              onChange={(e) => setDraft({...draft, behavior: e.target.value})}
            />
            <span className="absolute bottom-4 right-6 text-sm text-surface-400 font-light tracking-widest">
              {draft.behavior.length}/1000
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-6 border-t border-surface-200 pt-8">
          <button
            onClick={() => setDraft(null)}
            className="text-base font-medium tracking-widest text-surface-600 hover:text-black"
          >
            다시 쓰기
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
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
      <p className="text-surface-600 mb-12 text-lg font-medium leading-relaxed">
        핵심 단어나 짧은 문장만 작성해주세요.<br />
        나머지는 시스템이 전문적인 형식으로 완성합니다.
      </p>
      
      <form onSubmit={handleGenerate} className="flex flex-col">
        <div className="relative w-full">
          <textarea
            ref={textareaRef}
            value={keywords}
            maxLength={1000}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="여기에 핵심 단어를 입력하세요..."
            className="w-full min-h-[300px] bg-surface-100 rounded-lg p-6 pb-12 focus:ring-2 focus:ring-black focus:outline-none resize-none text-black text-2xl font-light placeholder:text-surface-500 leading-[1.8]"
          />
          <span className="absolute bottom-6 right-6 text-base text-surface-400 font-light tracking-widest">
            {keywords.length}/1000
          </span>
        </div>
        <div className="flex justify-end mt-12">
          <button
            type="submit"
            disabled={loading || !keywords.trim()}
            className="px-10 py-4 bg-black text-white text-base font-medium tracking-widest rounded-lg hover:bg-surface-800 disabled:opacity-30"
          >
            {loading ? '생성 중...' : '기록 초안 생성'}
          </button>
        </div>
      </form>
    </div>
  );
}
