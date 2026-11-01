import { db } from '@/db';
import { isRetryableWriteError } from './adapters/libsql';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// DB 쓰기만 전달한다. 외부 API 호출이나 재시도할 수 없는 부수 효과는 포함하지 않는다.
// Drizzle 원본 transaction API와 전체 객체는 계속 그대로 제공한다.
let pendingWrite: Promise<void> = Promise.resolve();

export function writeTransaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
  const result = pendingWrite.then(() => retryWriteTransaction(work));
  pendingWrite = result.then(() => undefined, () => undefined);
  return result;
}

async function retryWriteTransaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await db.transaction(work); }
    catch (error) {
      if (attempt >= 7 || !isRetryableWriteError(error)) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.min(5 * 2 ** attempt, 100) + Math.random() * 20));
    }
  }
}
