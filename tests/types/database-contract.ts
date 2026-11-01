import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { Database } from '../../src/db/contract';
import * as schema from '../../src/db/schema';

// D1의 공통 메서드 형태만 컴파일로 확인한다. D1 실행 호환성 검증은 아니다.
export function acceptsD1Shape(candidate: DrizzleD1Database<typeof schema>): Database {
  return candidate;
}

export async function checkDatabaseContract(db: Database) {
  const rows = await db.select({ id: schema.recipients.id }).from(schema.recipients).all();
  const id: string = rows[0].id;
  const user = await db.query.user.findFirst();
  const email: string | undefined = user?.email;
  await db.insert(schema.recipients).values({ id, name: '합성 대상자', createdAt: new Date() }).run();
  // @ts-expect-error 드라이버 client는 앱 계약에 없다.
  void db.$client;
  // @ts-expect-error 공급자별 batch 의미를 공통 기능으로 보장하지 않는다.
  db.batch([]);
  // @ts-expect-error 대화형 트랜잭션은 공통 계약에 없다.
  db.transaction(() => Promise.resolve());
  // @ts-expect-error 스키마에서 추론한 선택 결과는 숫자가 아니다.
  const invalidId: number = rows[0].id;
  // @ts-expect-error 스키마에 없는 필드로 쿼리할 수 없다.
  db.insert(schema.recipients).values({ recipientId: 'invalid' });
  return { id, email, invalidId };
}
