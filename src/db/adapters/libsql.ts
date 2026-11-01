import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import type { getDatabaseConfig } from '../../env';
import * as schema from '../schema';

// 연결 생명주기만 관리하고 Drizzle 객체와 추론 타입은 그대로 제공한다.
export function createLibsqlAdapter(config: ReturnType<typeof getDatabaseConfig>) {
  const client = createClient(config);
  return {
    db: drizzle(client, { schema }),
    close: () => client.close(),
  };
}

// SQLite의 쓰기 잠금은 일시적일 수 있다. 공급자 오류 분류는 이 경계 안에 둔다.
export function isRetryableWriteError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if ('code' in error && (error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_BUSY_SNAPSHOT')) return true;
  return error.cause !== error && error.cause !== undefined && isRetryableWriteError(error.cause);
}
