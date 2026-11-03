import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';
import { records } from '@/db/schema';
import { DAILY_RECORD_SECTIONS } from '@/lib/record-sections';

const recordSchema = createSelectSchema(records);
export const dailyRecordDraftSchema = z.object({
  cognition: recordSchema.shape.cognitionContent.unwrap().trim().max(1000),
  behavior: recordSchema.shape.behaviorContent.unwrap().trim().max(1000),
}).refine((draft) => Boolean(draft.cognition || draft.behavior), {
  message: '저장할 관찰 기록이 없습니다.',
});

export type DailyRecordDraft = z.infer<typeof dailyRecordDraftSchema>;

const currentFormat = DAILY_RECORD_SECTIONS.map(({ key, label }) => ({ key, marker: `[${label}]` }));
// 이전 버전에서 생성한 응답도 필드를 바꾸지 않고 읽는다.
const legacyFormat = [
  { key: 'cognition', marker: '[인지]' },
  { key: 'behavior', marker: '[행동]' },
] as const;

function getFormat(text: string) {
  return text.includes(currentFormat[0].marker) ? currentFormat : legacyFormat;
}

export function formatDailyRecord(draft: DailyRecordDraft): string {
  return currentFormat.map(({ key, marker }) => `${marker}\n${draft[key]}`).join('\n\n');
}

export function parseDailyRecordProgress(text: string): DailyRecordDraft {
  const [first, second] = getFormat(text);
  const draft = { cognition: '', behavior: '' };
  const firstStart = text.indexOf(first.marker);
  if (firstStart < 0) return draft;
  const contentStart = firstStart + first.marker.length;
  const secondStart = text.indexOf(second.marker, contentStart);
  if (secondStart >= 0) {
    draft[first.key] = text.slice(contentStart, secondStart).trim();
    draft[second.key] = text.slice(secondStart + second.marker.length).trim();
  } else {
    let content = text.slice(contentStart);
    // 마커가 여러 chunk로 나뉘어 도착할 때 본문에 노출하지 않는다.
    for (let size = second.marker.length - 1; size > 0; size--) {
      if (content.endsWith(second.marker.slice(0, size))) {
        content = content.slice(0, -size);
        break;
      }
    }
    draft[first.key] = content.trim();
  }
  return draft;
}

export function parseDailyRecord(text: string): DailyRecordDraft {
  const [first, second] = getFormat(text);
  const firstStart = text.indexOf(first.marker);
  const secondStart = text.indexOf(second.marker);
  if (firstStart === -1 || secondStart < firstStart + first.marker.length) {
    throw new Error('일일 기록 응답 형식을 확인할 수 없습니다.');
  }
  const result = dailyRecordDraftSchema.safeParse(parseDailyRecordProgress(text));
  if (!result.success) throw new Error('일일 기록 내용이 비어 있거나 허용 길이를 초과했습니다.');
  return result.data;
}
