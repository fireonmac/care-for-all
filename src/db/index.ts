import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import path from 'path';

// 프로젝트 루트 디렉토리의 sqlite.db를 참조
const client = createClient({
  url: `file:${path.join(process.cwd(), 'sqlite.db')}`,
});

export const db = drizzle(client, { schema });
