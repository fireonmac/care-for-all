import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { eq, max, sql } from 'drizzle-orm';
import ts from 'typescript';
import { sourceLoader } from './load-source.mjs';
import { wrapTestClient } from './libsql-fixture.mjs';

const load = sourceLoader();
const { recipients } = load('src/db/schema.ts');
const { createLibsqlAdapter } = load('src/db/adapters/libsql.ts');

test('libSQL adapter keeps schema-shaped CRUD, projection, aggregation and relational queries', async (t) => {
  const client = createClient({ url: ':memory:' });
  const adapter = wrapTestClient(client);
  t.after(() => adapter.close());
  await client.execute('CREATE TABLE recipients (id TEXT PRIMARY KEY, name TEXT NOT NULL, workspace_id TEXT, created_by_user_id TEXT, is_active INTEGER DEFAULT 1, created_at INTEGER NOT NULL)');
  const { db } = adapter;
  const createdAt = new Date('2026-11-01T00:00:00Z');
  const inserted = await db.insert(recipients).values({ id: 'synthetic', name: '합성 대상자', createdAt }).returning();
  assert.equal(inserted[0].id, 'synthetic');
  assert.equal(inserted[0].createdAt.getTime(), createdAt.getTime());
  assert.deepEqual(await db.select({ id: recipients.id }).from(recipients).where(eq(recipients.id, 'synthetic')).all(), [{ id: 'synthetic' }]);
  await db.update(recipients).set({ name: '수정한 합성 대상자' }).where(eq(recipients.id, 'synthetic')).run();
  assert.equal((await db.query.recipients.findFirst({ where: eq(recipients.id, 'synthetic') })).name, '수정한 합성 대상자');
  assert.equal((await db.select({ latest: max(recipients.createdAt) }).from(recipients).get()).latest.getTime(), createdAt.getTime());
  assert.equal((await db.delete(recipients).where(eq(recipients.id, 'synthetic')).returning())[0].id, 'synthetic');
  assert.equal(await db.query.recipients.findFirst(), undefined);
});

test('adapter preserves the original client and closes the connection', () => {
  const client = createClient({ url: ':memory:' });
  const adapter = wrapTestClient(client);
  try { assert.equal(adapter.db.$client, client); }
  finally { adapter.close(); }
  assert.equal(client.closed, true);
});

test('Drizzle CTE, distinct, batch and execution metadata remain available', async (t) => {
  const client = createClient({ url: ':memory:' });
  const adapter = wrapTestClient(client);
  t.after(() => adapter.close());
  const { db } = adapter;
  await db.run(sql`CREATE TABLE recipients (id TEXT PRIMARY KEY, name TEXT NOT NULL, workspace_id TEXT, created_by_user_id TEXT, is_active INTEGER DEFAULT 1, created_at INTEGER NOT NULL)`);
  const createdAt = new Date('2026-11-01T00:00:00Z');
  const [inserted, distinct] = await db.batch([
    db.insert(recipients).values([
      { id: 'first', name: '합성 대상자', createdAt },
      { id: 'second', name: '합성 대상자', createdAt },
    ]).returning({ id: recipients.id }),
    db.selectDistinct({ name: recipients.name }).from(recipients),
  ]);
  assert.deepEqual(inserted, [{ id: 'first' }, { id: 'second' }]);
  assert.deepEqual(distinct, [{ name: '합성 대상자' }]);
  const sq = db.$with('selected').as(db.select({ id: recipients.id }).from(recipients).where(eq(recipients.id, 'first')));
  assert.deepEqual(await db.with(sq).select().from(sq), [{ id: 'first' }]);
  const updated = await db.update(recipients).set({ name: '수정한 합성 대상자' }).run();
  assert.equal(updated.rowsAffected, 2);
  assert.equal(await db.$count(recipients), 2);
  assert.deepEqual(await db.all(sql`SELECT 1 AS value`), [{ value: 1 }]);
  assert.deepEqual(await db.get(sql`SELECT 1 AS value`), { value: 1 });
  assert.equal((await db.values(sql`SELECT 1 AS value`))[0][0], 1);
});

test('temporary file SQLite commits and rolls back Drizzle transactions across reconnect', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'care4all-drizzle-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const config = { url: `file:${path.join(directory, 'synthetic.db')}` };
  const adapter = createLibsqlAdapter(config);
  try {
    const { db } = adapter;
    await db.run(sql`CREATE TABLE recipients (id TEXT PRIMARY KEY, name TEXT NOT NULL, workspace_id TEXT, created_by_user_id TEXT, is_active INTEGER DEFAULT 1, created_at INTEGER NOT NULL)`);
    const createdAt = new Date('2026-11-01T00:00:00Z');
    const count = await db.transaction(async (tx) =>
      (await tx.insert(recipients).values({ id: 'committed', name: '보존할 합성 대상자', createdAt }).run()).rowsAffected);
    assert.equal(count, 1);
    await assert.rejects(db.transaction(async (tx) => {
      await tx.update(recipients).set({ name: '되돌릴 변경' }).where(eq(recipients.id, 'committed'));
      await tx.insert(recipients).values({ id: 'rolled-back', name: '되돌릴 합성 대상자', createdAt });
      throw new Error('synthetic rollback');
    }), /synthetic rollback/);
  } finally { adapter.close(); }
  const reopened = createLibsqlAdapter(config);
  try {
    assert.deepEqual(await reopened.db.select({ id: recipients.id, name: recipients.name }).from(recipients), [
      { id: 'committed', name: '보존할 합성 대상자' },
    ]);
  } finally { reopened.close(); }
});

test('failed writes reject without changing existing rows', async (t) => {
  const client = createClient({ url: ':memory:' });
  const adapter = wrapTestClient(client);
  t.after(() => adapter.close());
  await client.execute('CREATE TABLE recipients (id TEXT PRIMARY KEY, name TEXT NOT NULL, workspace_id TEXT, created_by_user_id TEXT, is_active INTEGER DEFAULT 1, created_at INTEGER NOT NULL)');
  const row = { id: 'synthetic', name: '합성 대상자', createdAt: new Date() };
  await adapter.db.insert(recipients).values(row);
  await assert.rejects(adapter.db.insert(recipients).values(row).run());
  assert.equal((await adapter.db.select().from(recipients)).length, 1);
});

test('production provider imports stay inside their adapter module', async () => {
  const root = path.resolve(import.meta.dirname, '../..');
  const files = [];
  async function walk(directory) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, item.name);
      if (item.isDirectory()) await walk(full);
      else if (/\.tsx?$/.test(item.name)) files.push(full);
    }
  }
  await walk(path.join(root, 'src'));
  const violations = [];
  for (const file of files) {
    const relative = path.relative(root, file);
    const source = ts.createSourceFile(file, await readFile(file, 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isStringLiteral(node) && /^(?:@libsql\/client|drizzle-orm\/(?:libsql|d1))(?:\/|$)/.test(node.text)
        && relative !== 'src/db/adapters/libsql.ts') violations.push(relative);
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.deepEqual(violations, []);
});
