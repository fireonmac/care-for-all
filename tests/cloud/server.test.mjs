import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import { sourceLoader } from './load-source.mjs';

const load = sourceLoader();
const { isAllowedUser } = load('src/lib/access.ts');

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

for (const fails of [false, true]) test('weekly after callback returns tracked Promise and stores ' + (fails ? 'FAILED' : 'COMPLETED'), async () => {
  const client = createClient({ url: ':memory:' });
  try {
    await client.execute('CREATE TABLE records (id TEXT PRIMARY KEY, recipient_id TEXT NOT NULL, date TEXT NOT NULL, type TEXT NOT NULL, cognition_content TEXT, behavior_content TEXT, combined_content TEXT, status TEXT NOT NULL DEFAULT \'COMPLETED\', created_at INTEGER NOT NULL)');
    const schema = load('src/db/schema.ts');
    const db = drizzle(client, { schema });
    await db.insert(schema.records).values({ id: 'synthetic-daily', recipientId: 'synthetic-recipient', date: '2026-10-26', type: 'daily', cognitionContent: '합성 관찰', createdAt: new Date() });
    const callbacks = [];
    const actions = sourceLoader({
      '@/db': { db },
      'next/server': { after: (callback) => callbacks.push(callback) },
      'next/cache': { revalidatePath() {} },
      '@/lib/auth': { getSession: async () => ({ user: { id: 'synthetic' } }), requireSession: async () => ({}) },
      '@/lib/ai': { generateWeeklyRecord: async () => { if (fails) throw new Error('synthetic-failure'); return '합성 주간 결과'; } },
    })('src/app/(main)/recipients/[id]/actions.ts');
    const created = await actions.generateWeeklyReportBackground('synthetic-recipient', '2026-10-26');
    assert.equal(created.status, 'PROCESSING'); assert.equal(callbacks.length, 1);
    const promise = callbacks[0](); assert.ok(promise instanceof Promise); await promise;
    const saved = await db.select().from(schema.records).where(eq(schema.records.id, created.recordId)).get();
    assert.equal(saved.status, fails ? 'FAILED' : 'COMPLETED');
    assert.equal(saved.combinedContent, fails ? null : '합성 주간 결과');
  } finally { client.close(); }
});


test('real session wrapper rejects an unlisted user and requires a verified listed email', async () => {
  let session = { user: { email: 'outsider@example.com', emailVerified: true } };
  const auth = sourceLoader({
    'better-auth': { betterAuth: () => ({ api: { getSession: async () => session } }) },
    '@better-auth/drizzle-adapter': { drizzleAdapter: () => ({}) },
    '@/db': { db: {} },
    '@/env': { getAuthEnv: () => ({ requireAllowlist: true, ALLOWED_EMAILS: 'caregiver@example.com' }) },
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

test('required allowlist cannot expose records when allowlist is missing, even if env validation is skipped', async () => {
  const auth = sourceLoader({
    'better-auth': { betterAuth: () => ({ api: { getSession: () => { throw new Error('must fail closed before session access'); } } }) },
    '@better-auth/drizzle-adapter': { drizzleAdapter: () => ({}) },
    '@/db': { db: {} },
    '@/env': { getAuthEnv: () => ({ requireAllowlist: true, ALLOWED_EMAILS: ' , ' }) },
    'next/headers': { headers: async () => new Headers() },
    'next/navigation': { redirect: () => { throw new Error('redirect-login'); } },
  })('src/lib/auth.ts');
  assert.equal(await auth.getSession(), null);
});
