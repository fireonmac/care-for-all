import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { eq, max } from 'drizzle-orm';
import ts from 'typescript';
import { sourceLoader } from './load-source.mjs';
import { wrapTestClient } from './libsql-fixture.mjs';

const { recipients } = sourceLoader()('src/db/schema.ts');

test('database contract keeps schema-shaped CRUD, projection, aggregation and relational queries', async (t) => {
  const client = createClient({ url: ':memory:' });
  const adapter = wrapTestClient(client);
  t.after(() => adapter.close());
  await client.execute('CREATE TABLE recipients (id TEXT PRIMARY KEY, name TEXT NOT NULL, is_active INTEGER DEFAULT 1, created_at INTEGER NOT NULL)');
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

test('application database surface does not expose driver clients or unsupported transaction capabilities', () => {
  const client = createClient({ url: ':memory:' });
  const adapter = wrapTestClient(client);
  try {
    for (const capability of ['$client', 'transaction', 'batch', 'execute', 'session', '_']) {
      assert.equal(capability in adapter.db, false, capability);
    }
  } finally { adapter.close(); }
  assert.equal(client.closed, true);
});

test('failed writes reject through the common contract without changing existing rows', async (t) => {
  const client = createClient({ url: ':memory:' });
  const adapter = wrapTestClient(client);
  t.after(() => adapter.close());
  await client.execute('CREATE TABLE recipients (id TEXT PRIMARY KEY, name TEXT NOT NULL, is_active INTEGER DEFAULT 1, created_at INTEGER NOT NULL)');
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
