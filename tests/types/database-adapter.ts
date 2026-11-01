import type { ResultSet } from '@libsql/client';
import type { drizzle } from 'drizzle-orm/libsql';
import { eq, sql } from 'drizzle-orm';
import type { db as applicationDb } from '../../src/db';
import * as schema from '../../src/db/schema';

type OriginalDatabase = ReturnType<typeof drizzle<typeof schema>>;

// 앱의 export가 원본 Drizzle API를 좁히지 않았는지 양방향으로 확인한다.
export function fromOriginal(db: OriginalDatabase): typeof applicationDb {
  return db;
}
export function toOriginal(db: typeof applicationDb): OriginalDatabase {
  return db;
}

// 실행하지 않는 컴파일 전용 검사다. 실제 DB나 외부 서비스에 접근하지 않는다.
export async function checkDatabaseTypes(db: typeof applicationDb) {
  const rows = await db.select({ id: schema.recipients.id }).from(schema.recipients).all();
  const id: string = rows[0].id;
  const values = { id, name: '합성 대상자', createdAt: new Date() };
  const inserted = await db.insert(schema.recipients).values(values).returning({ id: schema.recipients.id });
  const insertedId: string = inserted[0].id;
  const updated = await db.update(schema.recipients).set({ name: values.name }).returning({ id: schema.recipients.id });
  const updatedId: string = updated[0].id;
  const deleted = await db.delete(schema.recipients).returning({ id: schema.recipients.id });
  const deletedId: string = deleted[0].id;

  const result: ResultSet = await db.update(schema.recipients).set({ name: values.name }).run();
  const affected: number = result.rowsAffected;
  const transactionCount: number = await db.transaction(async (tx) =>
    (await tx.insert(schema.recipients).values(values).run()).rowsAffected);
  const batch = await db.batch([
    db.insert(schema.recipients).values(values).returning({ id: schema.recipients.id }),
    db.select({ id: schema.recipients.id }).from(schema.recipients),
  ]);
  const batchId: string = batch[0][0].id;
  const batchSelectedId: string = batch[1][0].id;

  const sq = db.$with('selected').as(db.select({ id: schema.recipients.id }).from(schema.recipients));
  const cteId: string = (await db.with(sq).select().from(sq))[0].id;
  const distinctName: string = (await db.selectDistinct({ name: schema.recipients.name }).from(schema.recipients))[0].name;
  const count: number = await db.$count(schema.recipients);
  const related = await db.query.user.findFirst({ columns: { email: true }, with: { sessions: { columns: { id: true } } } });
  const email: string | undefined = related?.email;
  const sessionId: string | undefined = related?.sessions[0].id;
  const joined = await db.select({ id: schema.records.id }).from(schema.recipients)
    .leftJoin(schema.records, eq(schema.recipients.id, schema.records.recipientId));
  const joinedId: string | null = joined[0].id;

  const raw: ResultSet = await db.run(sql`SELECT 1`);
  await db.all(sql`SELECT 1`);
  await db.get(sql`SELECT 1`);
  await db.values(sql`SELECT 1`);
  const client = db.$client;
  const cache = db.$cache;

  // @ts-expect-error 잘못된 입력 타입은 원본 Drizzle과 동일하게 거부한다.
  db.insert(schema.recipients).values({ ...values, id: 123 });
  // @ts-expect-error 스키마에 없는 컬럼을 선택할 수 없다.
  db.select({ missing: schema.recipients.nonexistent }).from(schema.recipients);
  // @ts-expect-error 잘못된 갱신 값은 거부한다.
  db.update(schema.recipients).set({ name: 123 });
  // @ts-expect-error 관계 조회에서도 없는 컬럼은 거부한다.
  db.query.user.findFirst({ columns: { nonexistent: true } });
  // @ts-expect-error 선택된 id의 타입은 string이다.
  const invalidId: number = rows[0].id;
  // @ts-expect-error 쓰기 메타데이터도 number 타입을 유지한다.
  const invalidCount: string = result.rowsAffected;
  return { id, insertedId, updatedId, deletedId, affected, transactionCount, batchId, batchSelectedId, cteId, distinctName, count, email, sessionId, joinedId, raw, client, cache, invalidId, invalidCount };
}
