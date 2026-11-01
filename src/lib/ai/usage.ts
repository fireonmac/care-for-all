import { and, eq, lt, sql } from 'drizzle-orm';
import { writeTransaction } from '@/db/transaction';
import { aiUsage } from '@/db/schema';
import { getAiUsageEnv } from '@/env';
import { getKSTDateStr } from '@/lib/dateUtils';

export class AiLimitError extends Error {
  constructor() { super('오늘의 AI 생성 한도에 도달했습니다. 직접 기록하거나 내일 다시 시도해주세요.'); }
}

export const DAILY_INPUT_LIMIT = 4000;
export const WEEKLY_INPUT_LIMIT = 16000;

export function validateAiInput(input: string, limit: number) {
  if (!input.trim() || input.length > limit) throw new Error(`관찰 내용은 1자 이상 ${limit}자 이내로 입력해주세요.`);
}

// 여러 인스턴스에서도 동일 DB의 원자적 카운터를 사용한다. 실패/취소도 예약을 소모한다.
// 요청 수 제한이며 금액 상한이 아니다. 실제 지출 상한은 공급자 설정을 별도로 확인한다.
export async function reserveAiUsage(userId: string) {
  const limits = getAiUsageEnv();
  const day = getKSTDateStr(new Date());
  await writeTransaction(async (tx) => {
    for (const [bucket, limit] of [
      ['global', limits.AI_DAILY_GLOBAL_LIMIT], [`user:${userId}`, limits.AI_DAILY_USER_LIMIT],
    ] as const) {
      if (limit === 0) throw new AiLimitError();
      const reserved = await tx.insert(aiUsage).values({ bucket, day, count: 1 })
        .onConflictDoUpdate({ target: [aiUsage.bucket, aiUsage.day], set: { count: sql`${aiUsage.count} + 1` },
          setWhere: and(eq(aiUsage.day, day), lt(aiUsage.count, limit)) })
        .returning({ count: aiUsage.count });
      if (reserved.length !== 1) throw new AiLimitError();
    }
  });
}
