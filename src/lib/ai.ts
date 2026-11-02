import { createTextGenerationProvider } from '@/lib/ai/provider';
import {
  createDailyRecordMessages,
  createWeeklyRecordMessages,
} from '@/lib/ai/prompts';

import { parseDailyRecord, type DailyRecordDraft } from '@/lib/daily-record';
export type { DailyRecordDraft } from '@/lib/daily-record';

const DAILY_TIMEOUT_MS = 60_000;
const WEEKLY_TIMEOUT_MS = 90_000;
// Reasoning and visible text share the provider output budget. Keep prose concise in the prompt.
const RECORD_OUTPUT_TOKENS = 4096;

export async function streamDailyRecord(
  keywords: string,
): Promise<ReadableStream<Uint8Array>> {
  const stream = await createTextGenerationProvider().streamText({
    messages: createDailyRecordMessages(keywords),
    temperature: 0.3,
    maxTokens: RECORD_OUTPUT_TOKENS,
    timeoutMs: DAILY_TIMEOUT_MS,
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
    maxTokens: RECORD_OUTPUT_TOKENS,
    timeoutMs: DAILY_TIMEOUT_MS,
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
        `[${record.date}]\n인지: ${record.cognition || '없음'}\n행동: ${record.behavior || '없음'}`,
    )
    .join('\n\n');

  return createTextGenerationProvider().generateText({
    messages: createWeeklyRecordMessages(recordsText),
    temperature: 0.3,
    maxTokens: RECORD_OUTPUT_TOKENS,
    timeoutMs: WEEKLY_TIMEOUT_MS,
  });
}
