import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceLoader } from './load-source.mjs';

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
  session = { user: { id: 'synthetic', emailVerified: true } };
  const response = await api.GET(new Request('http://localhost/api/recipients'));
  assert.deepEqual(await response.json(), page);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
});

test('all recipient read functions enforce session before querying data', async () => {
  const blocked = sourceLoader({ '@/lib/workspace-access': { requireActor: async () => { throw new Error('auth-required'); } }, '@/db': { db: { select: () => { throw new Error('DB must not be accessed'); } } } });
  await assert.rejects(blocked('src/features/recipients/queries.ts').getRecipientsPage(), /auth-required/);
  const detail = blocked('src/app/(main)/recipients/[id]/queries.ts');
  await assert.rejects(detail.getRecipientOr404('synthetic'), /auth-required/);
  await assert.rejects(detail.getRecipientRecords('synthetic'), /auth-required/);
});
