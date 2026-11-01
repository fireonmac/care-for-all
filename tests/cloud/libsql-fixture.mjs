import { sourceLoader } from './load-source.mjs';

// 초기화용 client는 테스트가 소유한다. 앱에는 실제 어댑터가 반환한 Drizzle 객체를 전달한다.
export function wrapTestClient(client) {
  return sourceLoader({ '@libsql/client': { createClient: () => client } })
    ('src/db/adapters/libsql.ts').createLibsqlAdapter({ url: ':memory:' });
}
