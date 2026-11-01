import test from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { createClient } from '@libsql/client';
import { wrapTestClient } from './libsql-fixture.mjs';
import { sourceLoader } from './load-source.mjs';
import { workspaceFixture } from './workspace-fixture.mjs';

const denied = /접근 권한|not-found/;
const request = (recipientId, keywords = '합성 관찰') => new Request('https://synthetic.example/api/generate-daily', { method: 'POST', body: JSON.stringify({ recipientId, keywords }) });

test('migration preserves synthetic legacy rows unassigned and hidden; provisioning is idempotent under concurrent first use', async t => {
  const f = await workspaceFixture(t);
  const spaces = await Promise.all(Array.from({ length: 12 }, () => f.access.ensureDefaultWorkspace('alice')));
  assert.equal(new Set(spaces.map(s => s.id)).size, 1);
  assert.equal((await f.db.select().from(f.schema.workspaceMembers)).length, 1);
  assert.deepEqual((await f.listing()).items, []);
  const legacy = await f.db.select().from(f.schema.recipients).where(eq(f.schema.recipients.id, 'legacy')).get();
  assert.equal(legacy.workspaceId, null); assert.equal(legacy.createdByUserId, null);
  const record = await f.db.select().from(f.schema.records).where(eq(f.schema.records.id, 'legacy-record')).get();
  assert.equal(record.cognitionContent, 'Synthetic legacy content');
  const id = await f.createRecipient('Synthetic Alice');
  const created = await f.db.select().from(f.schema.recipients).where(eq(f.schema.recipients.id, id)).get();
  assert.equal(created.workspaceId, spaces[0].id); assert.equal(created.createdByUserId, 'alice');
  f.login('bob'); const bob = await f.createRecipient('Synthetic Bob');
  assert.notEqual((await f.access.requireRecipient('bob', bob)).workspaceId, spaces[0].id);
  assert.deepEqual((await f.listing()).items.map(r => r.id), [bob]);
});

test('membership alone grants no records; explicit read/edit sharing stays recipient-scoped and is revocable', async t => {
  const f = await workspaceFixture(t);
  const one = await f.createRecipient('Synthetic One'); const two = await f.createRecipient('Synthetic Two');
  await f.actions.saveDailyRecord(one, '합성 기록', '', '2026-01-01');
  await f.actions.saveWeeklyReport(one, '합성 주간');
  const all = await f.load('src/app/(main)/recipients/[id]/queries.ts').getRecipientRecords(one);
  const daily = all.find(r => r.type === 'daily'); const weekly = all.find(r => r.type === 'weekly');
  const space = await f.access.ensureDefaultWorkspace('alice');
  await f.db.insert(f.schema.workspaceMembers).values({ workspaceId: space.id, userId: 'bob' });
  f.login('bob'); assert.deepEqual((await f.listing()).items, []);
  await assert.rejects(f.actions.getWeeklyRecord(weekly.id), denied);
  f.login('alice'); await f.share.shareRecipient(one, { email: 'bob@example.com', permission: 'read' });
  f.login('bob');
  assert.deepEqual((await f.listing()).items.map(r => r.id), [one]);
  assert.equal((await f.actions.getWeeklyRecord(weekly.id)).canEdit, false);
  await assert.rejects(f.actions.updateDailyRecord(daily.id, '침입', ''), denied);
  await assert.rejects(f.actions.saveWeeklyReport(one, '침입'), denied);
  await assert.rejects(f.actions.deleteRecord(daily.id), denied);
  await assert.rejects(f.share.shareRecipient(one, { email: 'charlie@example.com', permission: 'edit' }), denied);
  await assert.rejects(f.access.requireRecipient('bob', two), denied);
  assert.equal((await f.load('src/app/api/generate-daily/route.ts').POST(request(one))).status, 404);
  assert.equal(f.aiCalls(), 0);
  f.login('alice'); await f.share.shareRecipient(one, { email: 'bob@example.com', permission: 'edit' });
  f.login('bob'); await f.actions.updateDailyRecord(daily.id, '권한자의 과거 수정', '');
  await f.actions.updateWeeklyRecord(weekly.id, '권한자의 주간 수정');
  await f.actions.saveDailyRecord(one, '작성자 기록', '', '2025-01-01');
  const own = (await f.load('src/app/(main)/recipients/[id]/queries.ts').getRecipientRecords(one)).find(r => r.createdByUserId === 'bob');
  f.login('alice'); await f.share.shareRecipient(one, { email: 'bob@example.com', permission: 'read' });
  f.login('bob'); await f.actions.updateDailyRecord(own.id, '작성자 기본 편집', '');
  await assert.rejects(f.actions.updateDailyRecord(daily.id, '침입', ''), denied);
  f.login('alice'); await f.share.revokeRecipientShare(one, 'bob');
  f.login('bob'); await assert.rejects(f.actions.updateDailyRecord(own.id, '철회 후 수정', ''), denied);
  assert.deepEqual((await f.listing()).items, []);
});

test('every direct record/action/AI ID path denies another workspace before generation or mutation', async t => {
  const f = await workspaceFixture(t); const id = await f.createRecipient('Synthetic Private');
  await f.actions.saveDailyRecord(id, '원본', '', '2026-10-26'); await f.actions.saveWeeklyReport(id, '원본 주간');
  const rows = await f.db.select().from(f.schema.records).where(eq(f.schema.records.recipientId, id));
  const daily = rows.find(r => r.type === 'daily'), weekly = rows.find(r => r.type === 'weekly');
  f.login('charlie');
  const reads = f.load('src/app/(main)/recipients/[id]/queries.ts');
  for (const run of [
    () => reads.getRecipientOr404(id), () => reads.getRecipientRecords(id),
    () => f.actions.generateDraft('합성 메모', id), () => f.actions.generateWeeklyDraft(id),
    () => f.actions.saveDailyRecord(id, '침입', '', '2025-01-01'), () => f.actions.saveWeeklyReport(id, '침입'),
    () => f.actions.updateDailyRecord(daily.id, '침입', ''), () => f.actions.updateWeeklyRecord(weekly.id, '침입'),
    () => f.actions.deleteRecord(daily.id), () => f.actions.getWeeklyRecord(weekly.id),
    () => f.actions.getInitialWeeklyReportStatus(id, '2026-10-26'), () => f.actions.generateWeeklyReportBackground(id, '2026-10-26'),
    () => f.share.getRecipientShares(id), () => f.share.revokeRecipientShare(id, 'alice'),
  ]) await assert.rejects(run(), denied);
  const route = f.load('src/app/api/generate-daily/route.ts');
  assert.equal((await route.POST(request(id))).status, 404);
  assert.equal(f.aiCalls(), 0); assert.equal(f.callbacks.length, 0);
  assert.deepEqual(await f.db.select().from(f.schema.records).where(eq(f.schema.records.recipientId, id)), rows);
  f.login(null); assert.equal((await route.POST(request(id))).status, 401);
  f.login('unverified'); assert.equal((await route.POST(request(id))).status, 403);
});

for (const fails of [false, true]) test('weekly after tracks Promise and saves ' + (fails ? 'failure' : 'success') + ' without other workspace input', async t => {
  const f = await workspaceFixture(t, { generateWeekly: input => {
    assert.equal(input.length, 1); assert.equal(input[0].cognition, '합성 허용 기록');
    if (fails) throw new Error('synthetic-failure'); return '합성 주간 결과';
  } });
  const alice = await f.createRecipient('Synthetic Alice'); await f.actions.saveDailyRecord(alice, '다른 공간 기록', '', '2026-10-26');
  f.login('bob'); const bob = await f.createRecipient('Synthetic Bob'); await f.actions.saveDailyRecord(bob, '합성 허용 기록', '', '2026-10-26');
  const generated = await f.actions.generateWeeklyReportBackground(bob, '2026-10-26');
  const promise = f.callbacks[0](); assert.ok(promise instanceof Promise); await promise;
  const record = await f.actions.getWeeklyRecord(generated.recordId);
  assert.equal(record.status, fails ? 'FAILED' : 'COMPLETED');
  assert.equal(record.combinedContent, fails ? null : '합성 주간 결과');
});

test('revocation before background execution prevents AI input; revocation during execution prevents saving output', async t => {
  for (const during of [false, true]) {
    let f;
    f = await workspaceFixture(t, { generateWeekly: async () => { f.login('alice'); await f.share.revokeRecipientShare(id, 'bob'); return '삭제되어야 할 합성 결과'; } });
    const id = await f.createRecipient('Synthetic Shared'); await f.actions.saveDailyRecord(id, '합성 기록', '', '2026-10-26');
    await f.share.shareRecipient(id, { email: 'bob@example.com', permission: 'edit' });
    f.login('bob'); const generated = await f.actions.generateWeeklyReportBackground(id, '2026-10-26');
    if (!during) { f.login('alice'); await f.share.revokeRecipientShare(id, 'bob'); }
    await f.callbacks[0]();
    assert.equal(f.aiCalls(), during ? 1 : 0);
    f.login('alice'); const row = await f.actions.getWeeklyRecord(generated.recordId);
    assert.equal(row.status, 'FAILED'); assert.equal(row.combinedContent, null);
  }
});

test('new users can generate within limits; user/global quota is atomic, bounded and cannot be bypassed by alternate endpoints', async t => {
  const f = await workspaceFixture(t); f.limits.AI_DAILY_USER_LIMIT = 2; f.limits.AI_DAILY_GLOBAL_LIMIT = 3;
  const id = await f.createRecipient('Synthetic AI'); const route = f.load('src/app/api/generate-daily/route.ts');
  assert.equal((await route.POST(request(id))).status, 200);
  await f.actions.generateDraft('합성 관찰', id);
  assert.equal((await route.POST(request(id))).status, 429);
  assert.equal((await route.POST(request(id, '가'.repeat(4001)))).status, 400);
  await assert.rejects(f.actions.generateDraft('합성 관찰', id), /한도/);
  f.login('bob'); const bob = await f.createRecipient('Synthetic Bob AI');
  await f.actions.generateDraft('합성 관찰', bob);
  f.login('charlie'); const charlie = await f.createRecipient('Synthetic Charlie AI');
  await assert.rejects(f.actions.generateDraft('합성 관찰', charlie), /한도/);
  const usage = await f.db.select().from(f.schema.aiUsage);
  assert.equal(usage.find(r => r.bucket === 'global').count, 3);
  assert.equal(f.aiCalls(), 3);
  assert.equal(usage.some(r => r.bucket === 'user:charlie'), false);
});


test('20 concurrent reservations respect the user limit without SQLite lock errors or partial counters', async t => {
  const f = await workspaceFixture(t);
  f.limits.AI_DAILY_USER_LIMIT = 3; f.limits.AI_DAILY_GLOBAL_LIMIT = 5;
  const { reserveAiUsage, AiLimitError } = f.load('src/lib/ai/usage.ts');
  const results = await Promise.allSettled(Array.from({ length: 20 }, () => reserveAiUsage('alice')));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 3);
  for (const result of results.filter(r => r.status === 'rejected')) assert.ok(result.reason instanceof AiLimitError);
  const rows = await f.db.select().from(f.schema.aiUsage);
  assert.equal(rows.find(r => r.bucket === 'global').count, 3);
  assert.equal(rows.find(r => r.bucket === 'user:alice').count, 3);
});

test('returning to a default workspace does not restore revoked membership or allow new records', async t => {
  const f = await workspaceFixture(t); const workspace = await f.access.ensureDefaultWorkspace('alice');
  await f.db.delete(f.schema.workspaceMembers).where(eq(f.schema.workspaceMembers.workspaceId, workspace.id));
  await f.access.ensureDefaultWorkspace('alice');
  assert.equal((await f.db.select().from(f.schema.workspaceMembers)).length, 0);
  await assert.rejects(f.createRecipient('Synthetic unauthorized'), denied);
});


test('separate application instances share the same database quota', async t => {
  const f = await workspaceFixture(t); f.limits.AI_DAILY_USER_LIMIT = 10; f.limits.AI_DAILY_GLOBAL_LIMIT = 4;
  const first = f.load('src/lib/ai/usage.ts');
  const secondClient = createClient({ url: f.url }); t.after(() => secondClient.close());
  const secondDb = wrapTestClient(secondClient).db;
  const second = sourceLoader({ '@/db': { db: secondDb }, '@/env': { getAiUsageEnv: () => f.limits } })('src/lib/ai/usage.ts');
  const results = await Promise.allSettled(Array.from({ length: 12 }, (_, i) => (i % 2 ? first : second).reserveAiUsage(i % 2 ? 'alice' : 'bob')));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 4);
  for (const result of results.filter(r => r.status === 'rejected')) assert.match(result.reason.message, /한도/);
  const rows = await f.db.select().from(f.schema.aiUsage);
  assert.equal(rows.find(r => r.bucket === 'global').count, 4);
  assert.equal(rows.filter(r => r.bucket.startsWith('user:')).reduce((sum, r) => sum + r.count, 0), 4);
});


test('AI reservation can overlap record edits, deletion and weekly background completion', async t => {
  const f = await workspaceFixture(t); f.limits.AI_DAILY_USER_LIMIT = 10; f.limits.AI_DAILY_GLOBAL_LIMIT = 10;
  const id = await f.createRecipient('Synthetic Mixed');
  await f.actions.saveDailyRecord(id, '합성 원문', '', '2026-10-26');
  await f.actions.saveDailyRecord(id, '삭제할 합성 기록', '', '2026-10-27');
  const rows = await f.db.select().from(f.schema.records).where(eq(f.schema.records.recipientId, id));
  const report = await f.actions.generateWeeklyReportBackground(id, '2026-10-26');
  const { reserveAiUsage } = f.load('src/lib/ai/usage.ts');
  await Promise.all([
    reserveAiUsage('alice'), f.actions.updateDailyRecord(rows[0].id, '수정한 합성 원문', ''),
    f.actions.deleteRecord(rows[1].id), f.callbacks[0](),
  ]);
  assert.equal((await f.actions.getWeeklyRecord(report.recordId)).status, 'COMPLETED');
  await Promise.all([reserveAiUsage('alice'), f.actions.updateWeeklyRecord(report.recordId, '수정한 주간 기록')]);
  assert.equal((await f.actions.getWeeklyRecord(report.recordId)).combinedContent, '수정한 주간 기록');
});
