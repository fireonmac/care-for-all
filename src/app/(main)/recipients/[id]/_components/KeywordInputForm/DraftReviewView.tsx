'use client';

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { DAILY_RECORD_SECTIONS } from '@/lib/record-sections';
import { dailyRecordDraftSchema, type DailyRecordDraft } from '@/lib/daily-record';

interface DraftReviewViewProps {
  draft: DailyRecordDraft;
  loading: boolean;
  saving: boolean;
  onDraftChange: (draft: DailyRecordDraft) => void;
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
        <h2 className="text-3xl font-medium text-foreground tracking-tight">기록 검토</h2>
        {loading && <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />}
      </div>

      <div className="flex flex-col gap-16 mb-16">
        {DAILY_RECORD_SECTIONS.map(({ key, label }) => (
          <div key={key} className="flex flex-col relative">
            <h3 id={`draft-${key}-label`} className="text-base font-medium text-foreground tracking-widest mb-6">{label} 영역</h3>
            <Textarea
              aria-labelledby={`draft-${key}-label`}
              className={`text-xl pb-12 min-h-50 transition-all duration-500 ${loading && !draft[key] ? 'bg-muted animate-pulse text-foreground/80 border-border' : ''}`}
              value={draft[key]}
              placeholder={loading && !draft[key] ? `${label} 영역 작성을 준비하고 있습니다...` : ''}
              readOnly={loading}
              maxLength={1000}
              onChange={(e) => onDraftChange({ ...draft, [key]: e.target.value })}
            />
            <span className="absolute bottom-4 right-6 text-sm text-muted-foreground font-light tracking-widest">
              {draft[key].length}/1000
            </span>
          </div>
        ))}
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
          disabled={saving || loading || !dailyRecordDraftSchema.safeParse(draft).success}
        >
          {saving ? '저장 중...' : '최종 저장'}
        </Button>
      </div>
    </div>
  );
}
