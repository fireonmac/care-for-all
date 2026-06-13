'use client';

import { useState } from 'react';
import { generateDraft, saveDailyRecord } from './actions';
import { useRouter } from 'next/navigation';

export function KeywordInputForm({ recipientId, targetDate }: { recipientId: string, targetDate: string }) {
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<{cognition: string; behavior: string} | null>(null);
  const router = useRouter();
  
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
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
        <h2 className="text-3xl font-extrabold text-black mb-12 tracking-tight">생성된 기록 검토</h2>
        
        <div className="flex flex-col gap-10 mb-16">
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-surface-900 tracking-widest border-b border-surface-200 pb-4 mb-6">인지 영역</h3>
            <textarea
              className="w-full bg-surface-50 border border-surface-200 rounded-2xl p-6 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-surface-900 text-lg font-light leading-relaxed resize-none min-h-[160px] shadow-inner"
              value={draft.cognition}
              onChange={(e) => setDraft({...draft, cognition: e.target.value})}
            />
          </div>
          
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-surface-900 tracking-widest border-b border-surface-200 pb-4 mb-6">행동 영역</h3>
            <textarea
              className="w-full bg-surface-50 border border-surface-200 rounded-2xl p-6 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-surface-900 text-lg font-light leading-relaxed resize-none min-h-[160px] shadow-inner"
              value={draft.behavior}
              onChange={(e) => setDraft({...draft, behavior: e.target.value})}
            />
          </div>
        </div>

        <div className="flex justify-end gap-6 border-t border-surface-200 pt-8">
          <button
            onClick={() => setDraft(null)}
            className="text-base font-bold tracking-widest text-surface-500 hover:text-black transition-colors"
          >
            다시 쓰기
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-10 py-4 bg-black text-white text-base font-bold tracking-widest rounded-xl hover:bg-surface-800 transition-colors disabled:opacity-50"
          >
            {saving ? '저장 중...' : '최종 저장'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-3xl font-extrabold text-black mb-4 tracking-tight">관찰 키워드 입력</h2>
      <p className="text-surface-400 mb-12 text-lg font-light leading-relaxed">
        핵심 단어나 짧은 문장만 작성해주세요.<br />
        나머지는 시스템이 전문적인 형식으로 완성합니다.
      </p>
      
      <form onSubmit={handleGenerate} className="flex flex-col">
        <textarea
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="여기에 키워드를 입력하세요..."
          className="w-full h-48 bg-surface-50 border border-surface-200 rounded-2xl p-8 focus:ring-1 focus:border-primary-500 resize-none transition-colors text-black text-2xl font-light placeholder:text-surface-300 shadow-inner"
        />
        <div className="flex justify-end mt-10">
          <button
            type="submit"
            disabled={loading || !keywords.trim()}
            className="px-12 py-5 bg-black text-white text-base font-bold tracking-widest rounded-xl hover:bg-surface-800 transition-all disabled:opacity-30"
          >
            {loading ? '생성 중...' : '기록 초안 생성'}
          </button>
        </div>
      </form>
    </div>
  );
}
