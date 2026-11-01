import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import type { getDatabaseConfig } from '../env';
import * as schema from './schema';

// 같은 libSQL 연결 경계로 로컬 SQLite와 원격 DB를 구성한다.
export function createDatabase(config: ReturnType<typeof getDatabaseConfig>) {
  return drizzle(createClient(config), { schema });
}
