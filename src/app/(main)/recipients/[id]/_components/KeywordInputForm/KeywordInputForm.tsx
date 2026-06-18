'use client';

import { useState } from 'react';
import { Accordion } from '@/components/ui/accordion';
import { getKSTDateStr } from '@/lib/dateUtils';
import { DraftReviewView } from './DraftReviewView';
import { useGenerateDailyDraft, useSaveDailyRecordMutation } from './useKeywordQueries';
import { EventInputItem } from './EventInputItem';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const eventSchema = z.object({
  id: z.string(),
  event: z.string(),
  emotion: z.string(),
  isCustomEmotion: z.boolean(),
  action: z.string(),
});

const formSchema = z.object({
  events: z.array(eventSchema).min(1),
});

type FormValues = z.infer<typeof formSchema>;

export function KeywordInputForm({ recipientId, targetDate }: { recipientId: string, targetDate: string }) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [activeEventId, setActiveEventId] = useState<string[]>([]);

  // 1. react-hook-form 설정
  const { control, handleSubmit, watch, setValue, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      events: [{ id: 'default-id', event: '', emotion: '', isCustomEmotion: false, action: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'events',
  });

  const events = watch('events');
  const hasRequiredEvent = events.some((e) => e.event.trim().length > 0);

  // 2. API 통신 훅 (생성 및 저장)
  const { generateDraft, draft, setDraft, isGenerating } = useGenerateDailyDraft();
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
    } catch {
      showError('초안 생성 중 오류가 발생했습니다.');
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
        reset({ events: [{ id: crypto.randomUUID(), event: '', emotion: '', isCustomEmotion: false, action: '' }] });
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
        시스템이 이를 분석하여 훨씬 더 풍부하고 전문적인 일지로 바꾸어줍니다.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
        <Accordion
          value={activeEventId.length === 0 && fields.length > 0 ? [fields[0].id] : activeEventId}
          onValueChange={(val) => {
            if (val.length > 0) setActiveEventId(val as string[]);
          }}
          className="flex flex-col gap-4"
        >
          {fields.map((field, index) => (
            <EventInputItem
              key={field.id}
              event={events[index]}
              index={index}
              isFuture={isFuture}
              canRemove={fields.length > 1}
              onUpdate={(updates) => {
                setValue(`events.${index}`, { ...events[index], ...updates });
              }}
              onRemove={() => remove(index)}
              autoFocus={activeEventId.includes(events[index]?.id)}
            />
          ))}
        </Accordion>

        <div className="flex flex-col mb-4 mt-2">
          <Button
            type="button"
            onClick={() => {
              const newId = crypto.randomUUID();
              append({ id: newId, event: '', emotion: '', isCustomEmotion: false, action: '' });
              setActiveEventId([newId]);
            }}
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
