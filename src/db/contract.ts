import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from './schema';

// 앱과 Better Auth가 쓰는 비동기 SQLite 기능만 노출한다.
// 쓰기 실행 결과는 드라이버마다 다르므로 공통 계약에서 해석하지 않는다.
export type Database = Pick<
  BaseSQLiteDatabase<'async', unknown, typeof schema>,
  'select' | 'insert' | 'update' | 'delete' | 'query'
>;

export type DatabaseAdapter = {
  db: Database;
  close(): void;
};
