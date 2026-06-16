'use client';

import { Textarea, commonInputClasses } from '@/components/Textarea';
import { getKSTDateStr } from '@/lib/dateUtils';
import { DraftReviewView } from './DraftReviewView';
import { useKeywordInputForm } from './useKeywordInputForm';

const PREDEFINED_EMOTIONS = [
  { id: 'happy', icon: '🥰', label: '편안/기분좋음', text: '편안하고 기분 좋은 상태이심' },
  { id: 'neutral', icon: '😌', label: '차분함', text: '특별한 감정 동요 없이 차분하심' },
  { id: 'anxious', icon: '😰', label: '우울/불안', text: '우울해하거나 불안해하심' },
  { id: 'angry', icon: '😡', label: '거부/화남', text: '거부 반응을 보이거나 화를 내심' },
];

export function KeywordInputForm({ recipientId, targetDate }: { recipientId: string, targetDate: string }) {
  const {
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
        {events.map((e, i) => {
          const isEventEmpty = !e.event.trim();

          return (
          <div key={e.id} className="relative bg-white p-8 md:p-10 rounded-3xl border-2 border-surface-300 flex flex-col gap-8 mb-4">
            <div className="flex items-center justify-between pb-2">
              <span className="text-base font-medium text-black tracking-widest">사건 {i + 1}</span>
              {events.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEvent(e.id)}
                  className="text-surface-500 hover:text-status-danger text-sm tracking-widest font-medium transition-colors"
                >
                  삭제
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-base tracking-widest text-black flex items-baseline">
                일어난 사건 <span className="text-sm text-surface-600 font-normal ml-2">(필수)</span>
              </label>
              <input
                id={`event-input-${e.id}`}
                type="text"
                value={e.event}
                onChange={(ev) => updateEvent(e.id, { event: ev.target.value })}
                disabled={isFuture}
                placeholder="어떤 일이 있었나요? (예: 식사 중 숟가락을 떨어뜨리심)"
                className={`px-5 py-3.5 text-lg font-normal ${commonInputClasses}`}
              />
            </div>

            <div className={`flex flex-col gap-3 transition-opacity duration-300 ${isEventEmpty ? 'opacity-40' : 'opacity-100'}`}>
              <label className="text-base tracking-widest text-black flex items-baseline">
                어르신의 감정 및 반응 <span className="text-sm text-surface-500 font-normal ml-2">(선택)</span>
              </label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PREDEFINED_EMOTIONS.map(emo => (
                  <button
                    key={emo.id}
                    type="button"
                    onClick={() => updateEvent(e.id, { emotion: emo.text, isCustomEmotion: false })}
                    disabled={isFuture || isEventEmpty}
                    className={`px-5 py-2.5 rounded-full text-base font-medium transition-all disabled:cursor-not-allowed ${
                      !e.isCustomEmotion && e.emotion === emo.text
                        ? 'bg-white border-2 border-black text-black'
                        : 'bg-white border-2 border-surface-200 text-surface-500 hover:border-surface-400 hover:text-surface-700'
                    }`}
                  >
                    {emo.icon} {emo.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => updateEvent(e.id, { isCustomEmotion: true, emotion: '' })}
                  disabled={isFuture || isEventEmpty}
                  className={`px-5 py-2.5 rounded-full text-base font-medium transition-all disabled:cursor-not-allowed ${
                    e.isCustomEmotion
                      ? 'bg-white border-2 border-black text-black'
                      : 'bg-white border-2 border-surface-200 text-surface-500 hover:border-surface-400 hover:text-surface-700'
                  }`}
                >
                  ✏️ 직접 입력
                </button>
              </div>
              {e.isCustomEmotion && (
                <input
                  type="text"
                  value={e.emotion}
                  onChange={(ev) => updateEvent(e.id, { emotion: ev.target.value })}
                  disabled={isFuture || isEventEmpty}
                  placeholder="직접 감정이나 반응을 입력해주세요"
                  className={`mt-2 px-5 py-3.5 text-lg font-normal ${commonInputClasses}`}
                />
              )}
            </div>

            <div className={`flex flex-col gap-2 transition-opacity duration-300 ${isEventEmpty ? 'opacity-40' : 'opacity-100'}`}>
              <label className="text-base tracking-widest text-black flex items-baseline">
                요양보호사의 조치 <span className="text-sm text-surface-500 font-normal ml-2">(선택)</span>
              </label>
              <input
                type="text"
                value={e.action}
                onChange={(ev) => updateEvent(e.id, { action: ev.target.value })}
                disabled={isFuture || isEventEmpty}
                placeholder="어떻게 대처하셨나요? (예: 안심시켜드리고 새 숟가락 교체)"
                className={`px-5 py-3.5 text-lg font-normal ${commonInputClasses}`}
              />
            </div>
          </div>
        );
      })}

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
