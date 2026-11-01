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
