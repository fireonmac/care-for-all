import { useLayoutEffect, useRef } from 'react';
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SpeechInputControl, SpeechInputFeedback } from './SpeechInputControl';
import type { SpeechInput } from './useSpeechInput';
import type { EventInput } from './KeywordInputForm';

const PREDEFINED_EMOTIONS = [
  { id: 'happy', icon: '🥰', label: '편안/기분좋음', text: '편안하고 기분 좋은 상태이심' },
  { id: 'neutral', icon: '😌', label: '차분함', text: '특별한 감정 동요 없이 차분하심' },
  { id: 'anxious', icon: '😰', label: '우울/불안', text: '우울해하거나 불안해하심' },
  { id: 'angry', icon: '😡', label: '거부/화남', text: '거부 반응을 보이거나 화를 내심' },
];

interface EventInputItemProps {
  event: EventInput;
  speech: SpeechInput;
  index: number;
  isFuture: boolean;
  canRemove: boolean;
  onUpdate: (fields: Partial<EventInput>) => void;
  onRemove: () => void;
  autoFocus?: boolean;
  error?: FieldError;
  eventField: UseFormRegisterReturn;
}

export function EventInputItem({
  event,
  speech,
  index,
  isFuture,
  canRemove,
  onUpdate,
  onRemove,
  autoFocus,
  error,
  eventField,
}: EventInputItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const lastAppend = useRef(speech.appendVersion);
  // Synchronize the DOM viewport only after a dictated append is rendered.
  // Manual edits keep their caret/selection, and the stop button keeps focus.
  useLayoutEffect(() => {
    if (lastAppend.current === speech.appendVersion) return;
    lastAppend.current = speech.appendVersion;
    if (speech.target?.eventId !== event.eventId) return;
    const input = itemRef.current?.querySelector<HTMLInputElement>(`[data-speech-field="${speech.target.field}"]`);
    if (!input) return;
    input.setSelectionRange(input.value.length, input.value.length);
    input.scrollLeft = input.scrollWidth;
  }, [speech.appendVersion, speech.target, event.eventId]);
  const listening = (field: 'event' | 'action' | 'emotion') => speech.busy && speech.target?.eventId === event.eventId && speech.target.field === field;
  const visibleError = listening('event') ? undefined : error;
  const errorId = `event-error-${event.eventId}`;
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
    <AccordionItem
      ref={itemRef}
      value={event.eventId}
      className="group relative rounded-3xl border-2 last:border-b-2 border-border bg-muted flex flex-col mb-4 overflow-hidden transition-all duration-300 data-[open]:border-primary data-[open]:shadow-xl data-[open]:bg-background data-[open]:scale-[1.01]"
    >
      <AccordionTrigger className="w-full text-left p-6 md:p-8 flex flex-col transition-all focus:outline-none hover:bg-muted/50 group-data-[open]:hover:bg-transparent [&>svg]:!hidden hover:no-underline items-stretch">
          <div className="flex items-center justify-between w-full">
            <span className="text-xl font-bold text-foreground tracking-widest flex items-center gap-2">
              사건 {index + 1}
              <ChevronDown className="w-6 h-6 text-foreground group-data-[open]:hidden" />
            </span>
          </div>
          {/* 요약 뷰: 아코디언이 닫혀있을 때만 보임 */}
          <div className="group-data-[open]:hidden mt-3 flex flex-col gap-2 w-full pr-12">
            <span className="text-muted-foreground truncate w-full text-lg font-medium">
              {summaryText}
            </span>
            {(event.emotion || event.action) && (
              <div className="flex items-center gap-3 text-sm font-medium mt-1 w-full min-w-0">
                {event.emotion && (
                  <span className="flex items-center gap-1.5 bg-muted text-muted-foreground px-2.5 py-1 rounded-lg shrink-0">
                    {emotionDisplay}
                  </span>
                )}
                {event.action && (
                  <span className="flex items-center gap-1 flex-1 min-w-0 text-muted-foreground">
                    <span className="text-muted-foreground/70 shrink-0">↳</span>
                    <span className="truncate">{event.action}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </AccordionTrigger>
        {canRemove && (
          <Button
            type="button"
            onClick={onRemove}
            variant="ghost"
            size="xs"
            className="absolute top-6 right-6 md:top-8 md:right-8 text-muted-foreground hover:text-destructive hover:bg-transparent z-10"
          >
            삭제
          </Button>
        )}

      <AccordionContent className="px-6 md:px-8 pb-8 md:pb-10 pt-4 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <label htmlFor={`event-input-${event.eventId}`} className="text-base tracking-widest text-foreground flex items-baseline">
            일어난 사건 <span className="text-sm text-muted-foreground font-normal ml-2">(필수)</span>
          </label>
          <div className="relative">
            <Input
              id={`event-input-${event.eventId}`}
              data-speech-field="event"
              autoComplete="off"
              type="text"
              {...eventField}
              aria-required="true"
              aria-invalid={Boolean(visibleError)}
              aria-describedby={[visibleError ? errorId : null, `speech-event-${event.eventId}`].filter(Boolean).join(' ')}
              value={event.event}
              disabled={isFuture}
              placeholder="어떤 일이 있었나요? (예: 식사 중 숟가락을 떨어뜨리심)"
              className={`pl-5 pr-14 py-3.5 text-lg font-normal ${listening('event') ? 'border-ring bg-muted/30' : ''} ${visibleError ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive' : ''}`}
              autoFocus={autoFocus}
            />
            <SpeechInputControl speech={speech} target={{ eventId: event.eventId, field: 'event' }} label={`사건 ${index + 1} 일어난 사건`} disabled={isFuture} inputId={`event-input-${event.eventId}`} />
          </div>
          <SpeechInputFeedback speech={speech} target={{ eventId: event.eventId, field: 'event' }} id={`speech-event-${event.eventId}`} />
          {visibleError && <p id={errorId} role="alert" className="text-sm text-destructive">{visibleError.message}</p>}
        </div>

        <div className={`flex flex-col gap-3 transition-opacity duration-300 ${isEventEmpty ? 'opacity-40' : 'opacity-100'}`}>
          <label className="text-base tracking-widest text-foreground flex items-baseline">
            어르신의 감정 및 반응 <span className="text-sm text-muted-foreground font-normal ml-2">(선택)</span>
          </label>
          <div className="flex flex-wrap gap-2 mt-1">
            {PREDEFINED_EMOTIONS.map(emo => (
              <Button
                key={emo.id}
                type="button"
                onClick={() => onUpdate({ emotion: emo.text, isCustomEmotion: false })}
                disabled={isFuture || isEventEmpty}
                variant="outline"
                className={`rounded-full transition-all px-5 py-2.5 h-auto ${
                  !event.isCustomEmotion && event.emotion === emo.text
                    ? 'border-primary text-foreground'
                    : 'border-border text-muted-foreground hover:border-input hover:text-foreground/80'
                }`}
              >
                {emo.icon} {emo.label}
              </Button>
            ))}
            <Button
              type="button"
              onClick={() => onUpdate({ isCustomEmotion: true, emotion: '' })}
              disabled={isFuture || isEventEmpty}
              variant="outline"
              className={`rounded-full transition-all px-5 py-2.5 h-auto ${
                event.isCustomEmotion
                  ? 'border-primary text-foreground'
                  : 'border-border text-muted-foreground hover:border-input hover:text-foreground/80'
              }`}
            >
              ✏️ 직접 입력
            </Button>
          </div>
          {event.isCustomEmotion && (
            <div className="mt-2 flex flex-col gap-2">
              <div className="relative">
                <Input
                  id={`emotion-input-${event.eventId}`}
                  data-speech-field="emotion"
                  aria-label="감정 및 반응"
                  aria-describedby={`speech-emotion-${event.eventId}`}
                  type="text"
                  value={event.emotion}
                  onChange={(ev) => onUpdate({ emotion: ev.target.value })}
                  disabled={isFuture || isEventEmpty}
                  placeholder="직접 감정이나 반응을 입력해주세요"
                  className={`pl-5 pr-14 py-3.5 text-lg font-normal ${listening('emotion') ? 'border-ring bg-muted/30' : ''}`}
                />
                <SpeechInputControl speech={speech} target={{ eventId: event.eventId, field: 'emotion' }} label={`사건 ${index + 1} 감정 및 반응`} disabled={isFuture || isEventEmpty} inputId={`emotion-input-${event.eventId}`} />
              </div>
              <SpeechInputFeedback speech={speech} target={{ eventId: event.eventId, field: 'emotion' }} id={`speech-emotion-${event.eventId}`} />
            </div>
          )}
        </div>

        <div className={`flex flex-col gap-2 transition-opacity duration-300 ${isEventEmpty ? 'opacity-40' : 'opacity-100'}`}>
          <label htmlFor={`action-input-${event.eventId}`} className="text-base tracking-widest text-foreground flex items-baseline">
            요양보호사의 조치 <span className="text-sm text-muted-foreground font-normal ml-2">(선택)</span>
          </label>
          <div className="relative">
            <Input
              id={`action-input-${event.eventId}`}
              data-speech-field="action"
              autoComplete="off"
              aria-label="요양보호사의 조치"
              aria-describedby={`speech-action-${event.eventId}`}
              type="text"
              value={event.action}
              onChange={(ev) => onUpdate({ action: ev.target.value })}
              disabled={isFuture || isEventEmpty}
              placeholder="어떻게 대처하셨나요? (예: 안심시켜드리고 새 숟가락 교체)"
              className={`pl-5 pr-14 py-3.5 text-lg font-normal ${listening('action') ? 'border-ring bg-muted/30' : ''}`}
            />
            <SpeechInputControl speech={speech} target={{ eventId: event.eventId, field: 'action' }} label={`사건 ${index + 1} 요양보호사의 조치`} disabled={isFuture || isEventEmpty} inputId={`action-input-${event.eventId}`} />
          </div>
          <SpeechInputFeedback speech={speech} target={{ eventId: event.eventId, field: 'action' }} id={`speech-action-${event.eventId}`} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
