import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceLoader } from './load-source.mjs';

const load = sourceLoader();
const { getDatabaseConfig } = load('src/env.ts');
const { isAllowedUser } = load('src/lib/access.ts');

test('local SQLite remains usable; remote DB requires token; Vercel forbids file fallback', () => {
  assert.deepEqual(getDatabaseConfig({ DATABASE_URL: 'file:./app_data/sqlite.db' }), { url: 'file:./app_data/sqlite.db', authToken: undefined });
  assert.equal(getDatabaseConfig({ DATABASE_URL: ':memory:' }).url, ':memory:');
  assert.throws(() => getDatabaseConfig({ VERCEL: '1' }), /원격/);
  assert.throws(() => getDatabaseConfig({ VERCEL: '1', DATABASE_URL: 'file:./private.db' }), /원격/);
  assert.throws(() => getDatabaseConfig({ DATABASE_URL: 'libsql://synthetic.turso.io' }), /TURSO_AUTH_TOKEN/);
  assert.deepEqual(getDatabaseConfig({ VERCEL: '1', DATABASE_URL: 'libsql://synthetic.turso.io', TURSO_AUTH_TOKEN: 'synthetic' }), { url: 'libsql://synthetic.turso.io', authToken: 'synthetic' });
});

test('allowlist checks exact normalized verified email; preserves optional local setting', () => {
  const user = { email: 'Caregiver@EXAMPLE.COM', emailVerified: true };
  assert.equal(isAllowedUser(user, ' caregiver@example.com , other@example.com '), true);
  assert.equal(isAllowedUser(user, 'giver@example.com'), false);
  assert.equal(isAllowedUser({ ...user, emailVerified: false }, 'caregiver@example.com'), false);
  assert.equal(isAllowedUser(user), true);
});

test('recipient API rejects anonymous callers before DB access, preserves authorized shape', async () => {
  let session = null;
  let calls = 0;
  const page = { items: [{ id: 'synthetic', name: '합성 대상자' }], nextCursor: null };
  const api = sourceLoader({
    '@/lib/auth': { getSession: async () => session },
    '@/features/recipients/queries': { getRecipientsPage: async () => { calls++; return page; } },
  })('src/app/api/recipients/route.ts');
  assert.equal((await api.GET(new Request('http://localhost/api/recipients'))).status, 401);
  assert.equal(calls, 0);
  session = { user: { id: 'synthetic' } };
  const response = await api.GET(new Request('http://localhost/api/recipients'));
  assert.deepEqual(await response.json(), page);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
});

test('all recipient read functions enforce session before querying data', async () => {
  const blocked = sourceLoader({ '@/lib/auth': { requireSession: async () => { throw new Error('auth-required'); } }, '@/db': { db: { select: () => { throw new Error('DB must not be accessed'); } } } });
  await assert.rejects(blocked('src/features/recipients/queries.ts').getRecipientsPage(), /auth-required/);
  const detail = blocked('src/app/(main)/recipients/[id]/queries.ts');
  await assert.rejects(detail.getRecipientOr404('synthetic'), /auth-required/);
  await assert.rejects(detail.getRecipientRecords('synthetic'), /auth-required/);
});

test('real session wrapper rejects an unlisted user and requires a verified listed email', async () => {
  let session = { user: { email: 'outsider@example.com', emailVerified: true } };
  const auth = sourceLoader({
    'better-auth': { betterAuth: () => ({ api: { getSession: async () => session } }) },
    '@better-auth/drizzle-adapter': { drizzleAdapter: () => ({}) },
    '@/db': { db: {} },
    '@/env': { getAuthEnv: () => ({ VERCEL: '1', ALLOWED_EMAILS: 'caregiver@example.com' }) },
    'next/headers': { headers: async () => new Headers() },
    'next/navigation': { redirect: () => { throw new Error('redirect-login'); } },
  })('src/lib/auth.ts');
  assert.equal(await auth.getSession(), null);
  await assert.rejects(auth.requireSession(), /redirect-login/);
  session = { user: { email: 'caregiver@example.com', emailVerified: false } };
  assert.equal(await auth.getSession(), null);
  session.user.emailVerified = true;
  assert.equal(await auth.requireSession(), session);
});

test('Vercel cannot expose records when allowlist is missing, even if env validation is skipped', async () => {
  const auth = sourceLoader({
    'better-auth': { betterAuth: () => ({ api: { getSession: () => { throw new Error('must fail closed before session access'); } } }) },
    '@better-auth/drizzle-adapter': { drizzleAdapter: () => ({}) },
    '@/db': { db: {} },
    '@/env': { getAuthEnv: () => ({ VERCEL: '1', ALLOWED_EMAILS: ' , ' }) },
    'next/headers': { headers: async () => new Headers() },
    'next/navigation': { redirect: () => { throw new Error('redirect-login'); } },
  })('src/lib/auth.ts');
  assert.equal(await auth.getSession(), null);
});
