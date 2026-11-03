'use client';

import { useEffect, useState } from 'react';
import { Accordion } from '@/components/ui/accordion';
import { getKSTDateStr } from '@/lib/dateUtils';
import { DraftReviewView } from './DraftReviewView';
import { useGenerateDailyDraft, useSaveDailyRecordMutation } from './useKeywordQueries';
import { EventInputItem } from './EventInputItem';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const eventSchema = z.object({
  eventId: z.string(),
  event: z.string().trim().min(1, '일어난 사건을 먼저 적어주세요.'),
  emotion: z.string(),
  isCustomEmotion: z.boolean(),
  action: z.string(),
});

const formSchema = z.object({
  events: z.array(eventSchema).min(1),
});

export type EventInput = z.infer<typeof eventSchema>;
type FormValues = z.infer<typeof formSchema>;

export function KeywordInputForm({ recipientId, targetDate }: { recipientId: string, targetDate: string }) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [activeEventId, setActiveEventId] = useState<string[]>([]);

  // 1. react-hook-form 설정
  const {
    control, handleSubmit, setValue, reset, getValues, register,
    trigger, getFieldState, setFocus, formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      events: [{ eventId: 'default-id', event: '', emotion: '', isCustomEmotion: false, action: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'events',
  });

  // 오류가 있는 사건을 연 다음, 등록된 필드에 RHF가 포커스하도록 한다.
  useEffect(() => {
    const index = fields.findIndex((field) => activeEventId.includes(field.eventId));
    if (index === -1) return;
    const name = `events.${index}.event` as const;
    if (getFieldState(name).invalid) setFocus(name);
  }, [activeEventId, fields, getFieldState, setFocus]);

  const events = useWatch({ control, name: 'events' }) || [];
  const hasRequiredEvent = events.some((e) => e.event.trim().length > 0);

  // 2. API 통신 훅 (생성 및 저장)
  const { generateDraft, draft, setDraft, isGenerating } = useGenerateDailyDraft(recipientId);
  const saveMut = useSaveDailyRecordMutation();

  const todayStr = getKSTDateStr(new Date());
  const isFuture = targetDate > todayStr;

  const onSubmit = async (data: FormValues) => {
    const validEvents = data.events.filter((e) => e.event.trim());
    if (validEvents.length === 0 || isGenerating) return;

    const keywords = validEvents.map((ev, index) => {
      let text = `[사건 ${index + 1}]`;
      if (ev.event.trim()) text += `\n- 일어난 사건: ${ev.event.trim()}`;
      if (ev.emotion.trim()) text += `\n- 어르신의 감정 및 반응: ${ev.emotion.trim()}`;
      if (ev.action.trim()) text += `\n- 요양보호사의 조치: ${ev.action.trim()}`;
      return text;
    }).join('\n\n');

    try {
      await generateDraft(keywords);
    } catch (error) {
      showError(error instanceof Error ? error.message : '초안 생성 중 오류가 발생했습니다.');
    }
  };

  const handleSave = () => {
    if (!draft) return;
    saveMut.mutate({
      recipientId,
      cognition: draft.cognition,
      behavior: draft.behavior,
      targetDate,
    }, {
      onSuccess: () => {
        showSuccess('성공적으로 저장되었습니다.');
        setDraft(null);
        reset({ events: [{ eventId: crypto.randomUUID(), event: '', emotion: '', isCustomEmotion: false, action: '' }] });
        setActiveEventId([]);
        router.refresh();
      },
      onError: () => {
        showError('저장에 실패했습니다.');
      }
    });
  };

  if (draft) {
    return (
      <DraftReviewView
        draft={draft}
        loading={isGenerating}
        saving={saveMut.isPending}
        onDraftChange={setDraft}
        onDiscard={() => setDraft(null)}
        onSave={handleSave}
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
        적어주신 내용을 바탕으로 신체와 인지 기록을 자연스럽게 정리해드려요.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit, (validationErrors) => {
          const firstInvalidEvent = getValues('events').find((_, index) => validationErrors.events?.[index]?.event);
          if (firstInvalidEvent) setActiveEventId([firstInvalidEvent.eventId]);
        })}
        className="flex flex-col gap-8"
      >
        <Accordion
          value={activeEventId.length === 0 && fields.length > 0 ? [fields[0].eventId] : activeEventId}
          onValueChange={(val) => {
            if (val.length > 0) setActiveEventId(val as string[]);
          }}
          className="flex flex-col gap-4"
        >
          {fields.map((field, index) => {
            // Field-array structure updates before its watched values on append.
            const event = events[index] ?? field;
            return (
              <EventInputItem
                key={field.id}
                event={event}
                index={index}
                isFuture={isFuture}
                canRemove={fields.length > 1}
                error={errors.events?.[index]?.event}
                eventField={register(`events.${index}.event`)}
                onUpdate={(updates) => {
                  setValue(`events.${index}`, { ...event, ...updates }, { shouldValidate: true, shouldDirty: true });
                }}
                onRemove={() => remove(index)}
                autoFocus={activeEventId.includes(event.eventId)}
              />
            );
          })}
        </Accordion>

        <div className="flex flex-col mb-4 mt-2">
          <Button
            type="button"
            onClick={async () => {
              // 최신 폼 값으로도 검사해 연속 클릭·watch 갱신 전 추가를 막는다.
              if (isFuture) return;
              const valid = await trigger('events');
              const currentEvents = getValues('events');
              const emptyIndex = currentEvents.findIndex((event) => !eventSchema.shape.event.safeParse(event.event).success);
              if (emptyIndex !== -1) {
                const name = `events.${emptyIndex}.event` as const;
                if (!getFieldState(name).invalid) await trigger(name);
                setActiveEventId([currentEvents[emptyIndex].eventId]);
                return;
              }
              if (!valid) return;
              const newId = crypto.randomUUID();
              append({ eventId: newId, event: '', emotion: '', isCustomEmotion: false, action: '' });
              setActiveEventId([newId]);
            }}
            disabled={isFuture}
            variant="outline"
            className="w-full py-4 border-dashed rounded-3xl hover:bg-muted"
          >
            <span className="text-2xl font-light mb-0.5">+</span> 새로운 사건 추가
          </Button>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" disabled={isGenerating || isFuture}
            onClick={() => setDraft({ cognition: '', behavior: '' })}>직접 기록 작성</Button>
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
