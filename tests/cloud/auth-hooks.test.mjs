import test from 'node:test';
import assert from 'node:assert/strict';
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import { sourceLoader } from './load-source.mjs';

test('installed Better Auth hooks block outside/unverified OAuth users and deny new sessions after removal', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('No external calls in synthetic auth tests'); });
  const client = createClient({ url: ':memory:' });
  t.after(() => client.close());
  await client.batch([
    'CREATE TABLE user (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, email_verified INTEGER NOT NULL, image TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)',
    'CREATE TABLE account (id TEXT PRIMARY KEY, account_id TEXT NOT NULL, provider_id TEXT NOT NULL, user_id TEXT NOT NULL, access_token TEXT, refresh_token TEXT, id_token TEXT, access_token_expires_at INTEGER, refresh_token_expires_at INTEGER, scope TEXT, password TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)',
    'CREATE TABLE session (id TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, token TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, ip_address TEXT, user_agent TEXT, user_id TEXT NOT NULL)',
  ]);
  const schema = sourceLoader()('src/db/schema.ts');
  const db = drizzle(client, { schema });
  const { auth } = sourceLoader({
    'better-auth': { betterAuth }, 'better-auth/api': { APIError },
    '@better-auth/drizzle-adapter': { drizzleAdapter }, '@/db': { db },
    '@/env': { getAuthEnv: () => ({
      VERCEL: '1', ALLOWED_EMAILS: 'caregiver@example.com',
      BETTER_AUTH_URL: 'https://synthetic.example',
      BETTER_AUTH_SECRET: 'synthetic-session-secret-1234567890-not-for-production',
      GOOGLE_CLIENT_ID: 'synthetic-id', GOOGLE_CLIENT_SECRET: 'synthetic-secret',
    }) },
    'next/headers': { headers: async () => new Headers() },
    'next/navigation': { redirect() {} },
  })('src/lib/auth.ts');
  const { internalAdapter } = await auth.$context;
  for (const user of [
    { email: 'outside@example.com', emailVerified: true },
    { email: 'caregiver@example.com', emailVerified: false },
  ]) {
    await assert.rejects(internalAdapter.createOAuthUser({ name: 'Synthetic', ...user }, { providerId: 'google', accountId: 'synthetic-id' }), (error) => error.status === 'FORBIDDEN');
  }
  for (const table of ['user', 'account', 'session']) assert.equal((await client.execute(`SELECT COUNT(*) AS count FROM ${table}`)).rows[0].count, 0);
  const { user } = await internalAdapter.createOAuthUser({ name: 'Synthetic', email: 'caregiver@example.com', emailVerified: true }, { providerId: 'google', accountId: 'synthetic-allowed' });
  assert.ok(await internalAdapter.createSession(user.id));
  await db.update(schema.user).set({ email: 'removed@example.com' }).where(eq(schema.user.id, user.id));
  await assert.rejects(internalAdapter.createSession(user.id), (error) => error.status === 'FORBIDDEN');
  assert.equal((await client.execute('SELECT COUNT(*) AS count FROM session')).rows[0].count, 1);
});
