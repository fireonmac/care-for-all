import test from 'node:test';
import assert from 'node:assert/strict';
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { createClient } from '@libsql/client';
import { wrapTestClient } from './libsql-fixture.mjs';
import { sourceLoader } from './load-source.mjs';

test('installed Better Auth accepts Google identities without an allowlist; session CRUD is unchanged', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('No external calls in synthetic auth tests'); });
  const client = createClient({ url: ':memory:' });
  t.after(() => client.close());
  await client.batch([
    'CREATE TABLE user (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, email_verified INTEGER NOT NULL, image TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)',
    'CREATE TABLE account (id TEXT PRIMARY KEY, account_id TEXT NOT NULL, provider_id TEXT NOT NULL, user_id TEXT NOT NULL, access_token TEXT, refresh_token TEXT, id_token TEXT, access_token_expires_at INTEGER, refresh_token_expires_at INTEGER, scope TEXT, password TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)',
    'CREATE TABLE session (id TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, token TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, ip_address TEXT, user_agent TEXT, user_id TEXT NOT NULL)',
  ]);
  const { db } = wrapTestClient(client);
  const { auth } = sourceLoader({
    'better-auth': { betterAuth }, 'better-auth/api': { APIError },
    '@better-auth/drizzle-adapter': { drizzleAdapter }, '@/db': { db },
    '@/env': { getAuthEnv: () => ({
      BETTER_AUTH_URL: 'https://synthetic.example',
      BETTER_AUTH_SECRET: 'synthetic-session-secret-1234567890-not-for-production',
      GOOGLE_CLIENT_ID: 'synthetic-id', GOOGLE_CLIENT_SECRET: 'synthetic-secret',
    }) },
    'next/headers': { headers: async () => new Headers() },
    'next/navigation': { redirect() {} },
  })('src/lib/auth.ts');
  const { internalAdapter } = await auth.$context;
  for (const identity of [
    { email: 'outside@example.com', emailVerified: true },
    { email: 'unverified@example.com', emailVerified: false },
  ]) {
    const created = await internalAdapter.createOAuthUser({ name: 'Synthetic', ...identity }, { providerId: 'google', accountId: identity.email });
    const session = await internalAdapter.createSession(created.user.id);
    assert.ok(session);
    await internalAdapter.deleteSession(session.token);
  }
  const { user } = await internalAdapter.createOAuthUser({ name: 'Synthetic', email: 'caregiver@example.com', emailVerified: true }, { providerId: 'google', accountId: 'synthetic-allowed' });
  const session = await internalAdapter.createSession(user.id);
  assert.ok(session);
  const found = await internalAdapter.findSession(session.token);
  assert.equal(found.user.id, user.id);
  assert.equal(found.session.id, session.id);
  const expiresAt = new Date('2026-12-01T00:00:00Z');
  await internalAdapter.updateSession(session.token, { expiresAt });
  assert.equal((await internalAdapter.findSession(session.token)).session.expiresAt.getTime(), expiresAt.getTime());
  await internalAdapter.deleteSession(session.token);
  assert.equal(await internalAdapter.findSession(session.token), null);
});
