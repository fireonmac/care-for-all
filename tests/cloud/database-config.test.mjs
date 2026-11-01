import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { sourceLoader } from './load-source.mjs';
import { wrapTestClient } from './libsql-fixture.mjs';

const load = sourceLoader();
const { getDatabaseConfig, isLocalDatabaseUrl } = load('src/env.ts');
const { createLibsqlAdapter } = load('src/db/adapters/libsql.ts');

test('local defaults and remote credentials are independent of the hosting provider', () => {
  assert.deepEqual(getDatabaseConfig({}), { url: 'file:./sqlite.db', authToken: undefined });
  for (const url of ['file:./app_data/sqlite.db', ':memory:']) {
    assert.equal(isLocalDatabaseUrl(url), true);
    assert.equal(getDatabaseConfig({ DATABASE_URL: url }).url, url);
  }
  assert.deepEqual(getDatabaseConfig({ DATABASE_URL: 'libsql://database.example', DATABASE_AUTH_TOKEN: ' synthetic ' }), {
    url: 'libsql://database.example', authToken: 'synthetic',
  });
  assert.throws(() => getDatabaseConfig({ DATABASE_URL: 'https://database.example' }), /DATABASE_AUTH_TOKEN/);
  assert.throws(() => getDatabaseConfig({ DATABASE_URL: 'postgres://database.example', DATABASE_AUTH_TOKEN: 'synthetic' }), /연결 URL/);
});

test('existing Turso credentials remain compatible and generic credentials take precedence', () => {
  const legacy = { DATABASE_URL: 'libsql://synthetic.turso.io', TURSO_AUTH_TOKEN: 'legacy-synthetic' };
  assert.equal(getDatabaseConfig(legacy).authToken, 'legacy-synthetic');
  assert.equal(getDatabaseConfig({ ...legacy, DATABASE_AUTH_TOKEN: 'generic-synthetic' }).authToken, 'generic-synthetic');
  assert.equal(getDatabaseConfig({ ...legacy, DATABASE_AUTH_TOKEN: ' ' }).authToken, 'legacy-synthetic');
});

test('ephemeral storage policy works on any host and preserves the Vercel safety default', () => {
  for (const host of [{ DATABASE_REQUIRE_REMOTE: 'true' }, { VERCEL: '1' }, { VERCEL: '1', DATABASE_REQUIRE_REMOTE: 'false' }]) {
    for (const DATABASE_URL of [undefined, 'file:./private.db', ':memory:', 'http://database.example']) {
      assert.throws(() => getDatabaseConfig({ ...host, DATABASE_URL }), /원격/);
    }
    assert.equal(getDatabaseConfig({ ...host, DATABASE_URL: 'https://database.example', DATABASE_AUTH_TOKEN: 'synthetic' }).url, 'https://database.example');
  }
  assert.throws(() => getDatabaseConfig({ DATABASE_REQUIRE_REMOTE: 'misspelled' }), /DATABASE_REQUIRE_REMOTE/);
});

test('Drizzle Kit and app use the same connection selection without auth or AI configuration', (t) => {
  const previous = process.env;
  t.after(() => { process.env = previous; });
  for (const fixture of [
    { env: { DATABASE_URL: 'file:./synthetic.db' }, dialect: 'sqlite' },
    { env: { DATABASE_URL: 'libsql://database.example', DATABASE_AUTH_TOKEN: 'synthetic' }, dialect: 'turso' },
  ]) {
    process.env = fixture.env;
    const kit = sourceLoader()('drizzle.config.ts').default;
    assert.equal(kit.dialect, fixture.dialect);
    assert.equal(kit.dbCredentials.url, getDatabaseConfig(fixture.env).url);
    if (fixture.dialect === 'turso') assert.equal(kit.dbCredentials.authToken, 'synthetic');
  }
});

test('libSQL adapter supports local memory and persistent SQLite with the real schema', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('No network calls in database tests'); });
  const directory = await mkdtemp(path.join(tmpdir(), 'care4all-database-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const { recipients } = load('src/db/schema.ts');
  for (const url of [':memory:', `file:${path.join(directory, 'synthetic.db')}`]) {
    const setup = createClient({ url });
    await setup.execute('CREATE TABLE recipients (id TEXT PRIMARY KEY, name TEXT NOT NULL, workspace_id TEXT, created_by_user_id TEXT, is_active INTEGER DEFAULT 1, created_at INTEGER NOT NULL)');
    let adapter;
    if (url === ':memory:') adapter = wrapTestClient(setup);
    else {
      setup.close();
      adapter = createLibsqlAdapter(getDatabaseConfig({ DATABASE_URL: url }));
    }
    const { db } = adapter;
    try {
      await db.insert(recipients).values({ id: 'synthetic', name: '합성 대상자', createdAt: new Date('2026-11-01T00:00:00Z') });
      assert.equal((await db.query.recipients.findFirst()).name, '합성 대상자');
    } finally { adapter.close(); }
    if (url.startsWith('file:')) {
      const reopened = createLibsqlAdapter(getDatabaseConfig({ DATABASE_URL: url }));
      try { assert.equal((await reopened.db.query.recipients.findFirst()).id, 'synthetic'); }
      finally { reopened.close(); }
    }
  }
});

test('remote adapter passes normalized credentials to the same driver without a remote call', () => {
  const connection = getDatabaseConfig({ DATABASE_URL: 'libsql://database.example', DATABASE_AUTH_TOKEN: 'synthetic' });
  let observed;
  const { createLibsqlAdapter: isolated } = sourceLoader({
    '@libsql/client': { createClient: (config) => { observed = config; return createClient({ url: ':memory:' }); } },
  })('src/db/adapters/libsql.ts');
  const adapter = isolated(connection);
  try { assert.deepEqual(observed, connection); }
  finally { adapter.close(); }
});
