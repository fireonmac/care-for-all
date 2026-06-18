'use client';

import { Accordion } from '@/components/ui/accordion';
import { getKSTDateStr } from '@/lib/dateUtils';
import { DraftReviewView } from './DraftReviewView';
import { useKeywordInputForm } from './useKeywordInputForm';
import { EventInputItem } from './EventInputItem';
import { Button } from '@/components/ui/button';

export function KeywordInputForm({ recipientId, targetDate }: { recipientId: string, targetDate: string }) {
  const {
    events,
    activeEventId,
    setActiveEventId,
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
  } = useKeywordInputForm(recipientId, targetDate);

  const todayStr = getKSTDateStr(new Date());
  const isFuture = targetDate > todayStr;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void generateDraft();
  };

  if (draft) {
    return (
      <DraftReviewView
        draft={draft}
        loading={isGenerating}
        saving={isSaving}
        onDraftChange={setDraft}
        onDiscard={discardDraft}
        onSave={() => saveDraft()}
      />
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-medium text-foreground tracking-tight">관찰 내용 입력</h2>
      </div>
      <p className="text-muted-foreground mb-12 text-xl font-medium leading-relaxed">
        일어난 사건과 어르신의 감정, 그리고 선생님의 조치를 나누어 적어주세요. <br />
        시스템이 이를 분석하여 훨씬 더 풍부하고 전문적인 일지로 바꾸어줍니다.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <Accordion
          value={activeEventId}
          onValueChange={(val) => {
            if (val.length > 0) setActiveEventId(val as string[]);
          }}
          className="flex flex-col gap-4"
        >
          {events.map((e, i) => (
            <EventInputItem
              key={e.id}
              event={e}
              index={i}
              isFuture={isFuture}
              canRemove={events.length > 1}
              onUpdate={(fields) => updateEvent(e.id, fields)}
              onRemove={() => removeEvent(e.id)}
              autoFocus={activeEventId.includes(e.id)}
            />
          ))}
        </Accordion>

        <div className="flex flex-col mb-4 mt-2">
          <Button
            type="button"
            onClick={addEvent}
            disabled={isFuture}
            variant="outline"
            className="w-full py-4 border-dashed rounded-3xl hover:bg-muted"
          >
            <span className="text-2xl font-light mb-0.5">+</span> 새로운 사건 추가
          </Button>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isGenerating || !hasRequiredEvent || isFuture}
          >
            {isGenerating ? '생성 중...' : '기록 초안 생성'}
          </Button>
        </div>
      </form>
    </div>
  );
}
