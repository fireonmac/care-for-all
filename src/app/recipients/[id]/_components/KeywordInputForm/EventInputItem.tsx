import { Accordion } from '@base-ui/react';
import { ChevronDown } from 'lucide-react';
import { commonInputClasses } from '@/components/Textarea';
import { EventInput } from './useKeywordInputForm';

const PREDEFINED_EMOTIONS = [
  { id: 'happy', icon: '🥰', label: '편안/기분좋음', text: '편안하고 기분 좋은 상태이심' },
  { id: 'neutral', icon: '😌', label: '차분함', text: '특별한 감정 동요 없이 차분하심' },
  { id: 'anxious', icon: '😰', label: '우울/불안', text: '우울해하거나 불안해하심' },
  { id: 'angry', icon: '😡', label: '거부/화남', text: '거부 반응을 보이거나 화를 내심' },
];

interface EventInputItemProps {
  event: EventInput;
  index: number;
  isFuture: boolean;
  canRemove: boolean;
  onUpdate: (fields: Partial<EventInput>) => void;
  onRemove: () => void;
  autoFocus?: boolean;
}

export function EventInputItem({
  event,
  index,
  isFuture,
  canRemove,
  onUpdate,
  onRemove,
  autoFocus,
}: EventInputItemProps) {
  const isEventEmpty = !event.event.trim();
  const summaryText = isEventEmpty ? '내용을 입력해주세요' : event.event;

  // 감정 아이콘 및 라벨 찾기
  const predefinedEmotion = !event.isCustomEmotion
    ? PREDEFINED_EMOTIONS.find((e) => e.text === event.emotion)
    : null;
  const emotionDisplay = predefinedEmotion
    ? `${predefinedEmotion.icon} ${predefinedEmotion.label}`
    : event.emotion;

  return (
    <Accordion.Item 
      value={event.id} 
      className="group relative rounded-3xl border-2 border-surface-200 bg-surface-50 flex flex-col mb-4 overflow-hidden transition-all duration-300 data-[open]:border-black data-[open]:shadow-xl data-[open]:bg-white data-[open]:scale-[1.01]"
    >
      <Accordion.Header className="flex w-full relative">
        <Accordion.Trigger className="w-full text-left p-6 md:p-8 flex flex-col transition-all focus:outline-none hover:bg-surface-100/50 group-data-[open]:hover:bg-transparent">
          <div className="flex items-center justify-between w-full">
            <span className="text-xl font-bold text-black tracking-widest flex items-center gap-2">
              사건 {index + 1}
              <ChevronDown className="w-6 h-6 text-black transition-opacity duration-300 group-data-[open]:opacity-0" />
            </span>
          </div>
          {/* 요약 뷰: 아코디언이 닫혀있을 때만 보임 */}
          <div className="group-data-[open]:hidden mt-3 flex flex-col gap-2 pr-12">
            <span className="text-surface-500 truncate max-w-[90%] text-lg font-medium">
              {summaryText}
            </span>
            {(event.emotion || event.action) && (
              <div className="flex items-center gap-3 text-sm font-medium mt-1">
                {event.emotion && (
                  <span className="flex items-center gap-1.5 bg-surface-100 text-surface-600 px-2.5 py-1 rounded-lg">
                    {emotionDisplay}
                  </span>
                )}
                {event.action && (
                  <span className="truncate max-w-[60%] text-surface-500 flex items-center gap-1">
                    <span className="text-surface-300">↳</span> {event.action}
                  </span>
                )}
              </div>
            )}
          </div>
        </Accordion.Trigger>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-6 right-6 md:top-8 md:right-8 text-surface-400 hover:text-status-danger text-sm tracking-widest font-medium transition-colors z-10 p-2"
          >
            삭제
          </button>
        )}
      </Accordion.Header>

      <Accordion.Panel className="px-6 md:px-8 pb-8 md:pb-10 pt-4 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <label className="text-base tracking-widest text-black flex items-baseline">
            일어난 사건 <span className="text-sm text-surface-600 font-normal ml-2">(필수)</span>
          </label>
          <input
            id={`event-input-${event.id}`}
            type="text"
            value={event.event}
            onChange={(ev) => onUpdate({ event: ev.target.value })}
            disabled={isFuture}
            placeholder="어떤 일이 있었나요? (예: 식사 중 숟가락을 떨어뜨리심)"
            className={`px-5 py-3.5 text-lg font-normal ${commonInputClasses}`}
            autoFocus={autoFocus}
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
                onClick={() => onUpdate({ emotion: emo.text, isCustomEmotion: false })}
                disabled={isFuture || isEventEmpty}
                className={`px-5 py-2.5 rounded-full text-base font-medium transition-all disabled:cursor-not-allowed ${
                  !event.isCustomEmotion && event.emotion === emo.text
                    ? 'bg-white border-2 border-black text-black'
                    : 'bg-white border-2 border-surface-200 text-surface-500 hover:border-surface-400 hover:text-surface-700'
                }`}
              >
                {emo.icon} {emo.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onUpdate({ isCustomEmotion: true, emotion: '' })}
              disabled={isFuture || isEventEmpty}
              className={`px-5 py-2.5 rounded-full text-base font-medium transition-all disabled:cursor-not-allowed ${
                event.isCustomEmotion
                  ? 'bg-white border-2 border-black text-black'
                  : 'bg-white border-2 border-surface-200 text-surface-500 hover:border-surface-400 hover:text-surface-700'
              }`}
            >
              ✏️ 직접 입력
            </button>
          </div>
          {event.isCustomEmotion && (
            <input
              type="text"
              value={event.emotion}
              onChange={(ev) => onUpdate({ emotion: ev.target.value })}
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
            value={event.action}
            onChange={(ev) => onUpdate({ action: ev.target.value })}
            disabled={isFuture || isEventEmpty}
            placeholder="어떻게 대처하셨나요? (예: 안심시켜드리고 새 숟가락 교체)"
            className={`px-5 py-3.5 text-lg font-normal ${commonInputClasses}`}
          />
        </div>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
