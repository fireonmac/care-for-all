import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import type { getDatabaseConfig } from '../../env';
import type { DatabaseAdapter } from '../contract';
import * as schema from '../schema';

// Turso와 로컬 SQLite는 같은 libSQL 드라이버 구현을 사용한다.
export function createLibsqlAdapter(config: ReturnType<typeof getDatabaseConfig>): DatabaseAdapter {
  const client = createClient(config);
  const database = drizzle(client, { schema });
  return {
    db: {
      select: database.select.bind(database),
      insert: database.insert.bind(database),
      update: database.update.bind(database),
      delete: database.delete.bind(database),
      query: database.query,
    },
    close: () => client.close(),
  };
}
