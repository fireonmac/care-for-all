'use client';

import { Textarea } from '@/components/Textarea';
import { Loader2 } from 'lucide-react';

interface DraftReviewViewProps {
  draft: { cognition: string; behavior: string };
  loading: boolean;
  saving: boolean;
  onDraftChange: (draft: { cognition: string; behavior: string }) => void;
  onDiscard: () => void;
  onSave: () => void;
}

export function DraftReviewView({
  draft,
  loading,
  saving,
  onDraftChange,
  onDiscard,
  onSave,
}: DraftReviewViewProps) {
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
            className={`text-xl pb-12 min-h-[200px] transition-all duration-500 ${loading && !draft.cognition ? 'bg-surface-50 animate-pulse text-surface-700 border-surface-300' : ''}`}
            value={draft.cognition}
            placeholder={loading && !draft.cognition ? 'AI가 문맥을 파악하고 작성을 준비하고 있습니다...' : ''}
            readOnly={loading}
            maxLength={1000}
            onChange={(e) => onDraftChange({ ...draft, cognition: e.target.value })}
          />
          <span className="absolute bottom-4 right-6 text-sm text-surface-500 font-light tracking-widest">
            {draft.cognition.length}/1000
          </span>
        </div>

        <div className="flex flex-col relative">
          <h3 className="text-base font-medium text-black tracking-widest mb-6">행동 영역</h3>
          <Textarea
            className={`text-xl pb-12 min-h-[200px] transition-all duration-500 ${loading && !draft.behavior ? 'bg-surface-50 animate-pulse text-surface-700 border-surface-300' : ''}`}
            value={draft.behavior}
            placeholder={
              loading && !draft.behavior && draft.cognition
                ? '인지 영역 완료. 행동 영역 작성을 준비합니다...'
                : loading && !draft.behavior
                  ? 'AI가 문맥을 파악하고 작성을 준비하고 있습니다...'
                  : ''
            }
            readOnly={loading}
            maxLength={1000}
            onChange={(e) => onDraftChange({ ...draft, behavior: e.target.value })}
          />
          <span className="absolute bottom-4 right-6 text-sm text-surface-500 font-light tracking-widest">
            {draft.behavior.length}/1000
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-6 border-t border-surface-200 pt-8">
        <button
          onClick={onDiscard}
          disabled={loading}
          className="text-base font-medium tracking-widest text-surface-600 hover:text-black disabled:opacity-30"
        >
          다시 쓰기
        </button>
        <button
          onClick={onSave}
          disabled={saving || loading}
          className="px-10 py-4 bg-black text-white text-base font-medium tracking-widest rounded-lg hover:bg-surface-800 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '최종 저장'}
        </button>
      </div>
    </div>
  );
}
