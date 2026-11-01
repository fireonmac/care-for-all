import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';
import { records } from '@/db/schema';

const recordSchema = createSelectSchema(records);
export const dailyRecordDraftSchema = z.object({
  cognition: recordSchema.shape.cognitionContent.unwrap().trim().max(1000),
  behavior: recordSchema.shape.behaviorContent.unwrap().trim().max(1000),
}).refine((draft) => Boolean(draft.cognition || draft.behavior), {
  message: '저장할 관찰 기록이 없습니다.',
});

export type DailyRecordDraft = z.infer<typeof dailyRecordDraftSchema>;

export function parseDailyRecord(text: string): DailyRecordDraft {
  const cognitionMarker = '[인지]';
  const behaviorMarker = '[행동]';
  const cognitionStart = text.indexOf(cognitionMarker);
  const behaviorStart = text.indexOf(behaviorMarker);
  if (cognitionStart === -1 || behaviorStart < cognitionStart + cognitionMarker.length) {
    throw new Error('일일 기록 응답 형식을 확인할 수 없습니다.');
  }
  const result = dailyRecordDraftSchema.safeParse({
    cognition: text.slice(cognitionStart + cognitionMarker.length, behaviorStart).trim(),
    behavior: text.slice(behaviorStart + behaviorMarker.length).trim(),
  });
  if (!result.success) throw new Error('일일 기록 내용이 비어 있거나 허용 길이를 초과했습니다.');
  return result.data;
}
