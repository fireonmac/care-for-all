import { DAILY_RECORD_SECTIONS } from '@/lib/record-sections';
import { createTextGenerationProvider } from '@/lib/ai/provider';
import {
  createDailyRecordMessages,
  createWeeklyRecordMessages,
} from '@/lib/ai/prompts';

import { parseDailyRecord, type DailyRecordDraft } from '@/lib/daily-record';
export type { DailyRecordDraft } from '@/lib/daily-record';

export async function streamDailyRecord(
  keywords: string,
  signal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const stream = await createTextGenerationProvider().streamText({
    messages: createDailyRecordMessages(keywords),
    temperature: 0.3,
    signal,
  });
  let text = '';
  const decoder = new TextDecoder();
  return stream.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      text += decoder.decode(chunk, { stream: true });
      controller.enqueue(chunk);
    },
    flush() { parseDailyRecord(text + decoder.decode()); },
  }));
}

export async function generateDailyRecord(
  keywords: string,
): Promise<DailyRecordDraft> {
  const text = await createTextGenerationProvider().generateText({
    messages: createDailyRecordMessages(keywords),
    temperature: 0.3,
  });

  return parseDailyRecord(text);
}

export async function generateWeeklyRecord(
  dailyRecords: Array<{
    date: string;
    cognition: string | null;
    behavior: string | null;
  }>,
): Promise<string> {
  const recordsText = dailyRecords
    .map(
      (record) =>
        `[${record.date}]\n${DAILY_RECORD_SECTIONS.map(({ key, label }) => `${label}: ${record[key] || '없음'}`).join('\n')}`,
    )
    .join('\n\n');

  return createTextGenerationProvider().generateText({
    messages: createWeeklyRecordMessages(recordsText),
    temperature: 0.3,
  });
}
