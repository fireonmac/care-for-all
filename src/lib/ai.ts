import { createTextGenerationProvider } from '@/lib/ai/provider';
import {
  createDailyRecordMessages,
  createWeeklyRecordMessages,
} from '@/lib/ai/prompts';

export type DailyRecordDraft = {
  cognition: string;
  behavior: string;
};

const DAILY_TIMEOUT_MS = 30_000;
const WEEKLY_TIMEOUT_MS = 60_000;

export async function streamDailyRecord(
  keywords: string,
): Promise<ReadableStream<Uint8Array>> {
  return createTextGenerationProvider().streamText({
    messages: createDailyRecordMessages(keywords),
    temperature: 0.3,
    maxTokens: 500,
    timeoutMs: DAILY_TIMEOUT_MS,
  });
}

export async function generateDailyRecord(
  keywords: string,
): Promise<DailyRecordDraft> {
  const text = await createTextGenerationProvider().generateText({
    messages: createDailyRecordMessages(keywords),
    temperature: 0.3,
    maxTokens: 500,
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
    maxTokens: 700,
    timeoutMs: WEEKLY_TIMEOUT_MS,
  });
}



function parseDailyRecord(text: string): DailyRecordDraft {
  const cognitionMarker = '[인지]';
  const behaviorMarker = '[행동]';
  const cognitionStart = text.indexOf(cognitionMarker);
  const behaviorStart = text.indexOf(behaviorMarker);

  if (
    cognitionStart === -1 ||
    behaviorStart === -1 ||
    behaviorStart < cognitionStart
  ) {
    throw new Error('일일 기록 응답 형식을 확인할 수 없습니다.');
  }

  return {
    cognition: text
      .slice(cognitionStart + cognitionMarker.length, behaviorStart)
      .trim(),
    behavior: text.slice(behaviorStart + behaviorMarker.length).trim(),
  };
}
