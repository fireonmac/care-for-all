'use client';

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
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
        <h2 className="text-3xl font-medium text-foreground tracking-tight">생성된 기록 검토</h2>
        {loading && <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />}
      </div>

      <div className="flex flex-col gap-16 mb-16">
        <div className="flex flex-col relative">
          <h3 className="text-base font-medium text-foreground tracking-widest mb-6">인지 영역</h3>
          <Textarea
            className={`text-xl pb-12 min-h-50 transition-all duration-500 ${loading && !draft.cognition ? 'bg-muted animate-pulse text-foreground/80 border-border' : ''}`}
            value={draft.cognition}
            placeholder={loading && !draft.cognition ? 'AI가 문맥을 파악하고 작성을 준비하고 있습니다...' : ''}
            readOnly={loading}
            maxLength={1000}
            onChange={(e) => onDraftChange({ ...draft, cognition: e.target.value })}
          />
          <span className="absolute bottom-4 right-6 text-sm text-muted-foreground font-light tracking-widest">
            {draft.cognition.length}/1000
          </span>
        </div>

        <div className="flex flex-col relative">
          <h3 className="text-base font-medium text-foreground tracking-widest mb-6">행동 영역</h3>
          <Textarea
            className={`text-xl pb-12 min-h-50 transition-all duration-500 ${loading && !draft.behavior ? 'bg-muted animate-pulse text-foreground/80 border-border' : ''}`}
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
          <span className="absolute bottom-4 right-6 text-sm text-muted-foreground font-light tracking-widest">
            {draft.behavior.length}/1000
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-6 border-t border-border pt-8">
        <Button
          onClick={onDiscard}
          disabled={loading}
          variant="ghost"
        >
          다시 쓰기
        </Button>
        <Button
          onClick={onSave}
          disabled={saving || loading}
        >
          {saving ? '저장 중...' : '최종 저장'}
        </Button>
      </div>
    </div>
  );
}
