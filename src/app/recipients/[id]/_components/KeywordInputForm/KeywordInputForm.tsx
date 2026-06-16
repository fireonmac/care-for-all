'use client';

import { Accordion } from '@base-ui/react';
import { Textarea, commonInputClasses } from '@/components/Textarea';
import { getKSTDateStr } from '@/lib/dateUtils';
import { DraftReviewView } from './DraftReviewView';
import { useKeywordInputForm } from './useKeywordInputForm';
import { EventInputItem } from './EventInputItem';

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
        <h2 className="text-3xl font-medium text-black tracking-tight">관찰 내용 입력</h2>
      </div>
      <p className="text-surface-600 mb-12 text-xl font-medium leading-relaxed">
        일어난 사건과 어르신의 감정, 그리고 선생님의 조치를 나누어 적어주세요. <br />
        시스템이 이를 분석하여 훨씬 더 풍부하고 전문적인 일지로 바꾸어줍니다.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <Accordion.Root
          value={activeEventId}
          onValueChange={(val) => setActiveEventId(val as string | null)}
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
            />
          ))}
        </Accordion.Root>

        <div className="flex flex-col mb-8 mt-2">
          <button
            type="button"
            onClick={addEvent}
            disabled={isFuture}
            className="w-full py-5 border-2 border-dashed border-surface-300 hover:border-black hover:bg-surface-50 text-surface-500 hover:text-black rounded-3xl flex items-center justify-center gap-2 text-base font-medium tracking-widest transition-all disabled:opacity-30 disabled:hover:border-surface-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          >
            <span className="text-2xl font-light mb-0.5">+</span> 새로운 사건 추가
          </button>
        </div>

        <div className="flex justify-end mt-4">
          <button
            type="submit"
            disabled={isGenerating || !hasRequiredEvent || isFuture}
            className="px-10 py-4 bg-black text-white text-base font-medium tracking-widest rounded-lg hover:bg-surface-800 disabled:opacity-30"
          >
            {isGenerating ? '생성 중...' : '기록 초안 생성'}
          </button>
        </div>
      </form>
    </div>
  );
}
