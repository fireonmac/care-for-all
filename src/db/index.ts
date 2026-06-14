import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import path from 'path';

// 환경변수 우선 적용, 없을 경우 로컬 sqlite.db 참조
const dbUrl = process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'sqlite.db')}`;

const client = createClient({
  url: dbUrl,
});

export const db = drizzle(client, { schema });
