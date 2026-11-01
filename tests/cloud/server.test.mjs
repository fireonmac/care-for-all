import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceLoader } from './load-source.mjs';

const { getDatabaseConfig } = sourceLoader()('src/env.ts');

test('local SQLite remains usable; remote DB requires token; Vercel forbids file fallback', () => {
  assert.deepEqual(getDatabaseConfig({ DATABASE_URL: 'file:./app_data/sqlite.db' }), { url: 'file:./app_data/sqlite.db', authToken: undefined });
  assert.equal(getDatabaseConfig({ DATABASE_URL: ':memory:' }).url, ':memory:');
  assert.throws(() => getDatabaseConfig({ VERCEL: '1' }), /원격/);
  assert.throws(() => getDatabaseConfig({ VERCEL: '1', DATABASE_URL: 'file:./private.db' }), /원격/);
  assert.throws(() => getDatabaseConfig({ DATABASE_URL: 'libsql://synthetic.turso.io' }), /TURSO_AUTH_TOKEN/);
  assert.deepEqual(getDatabaseConfig({ VERCEL: '1', DATABASE_URL: 'libsql://synthetic.turso.io', TURSO_AUTH_TOKEN: 'synthetic' }), { url: 'libsql://synthetic.turso.io', authToken: 'synthetic' });
});
