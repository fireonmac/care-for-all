import test from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { workspaceFixture } from './workspace-fixture.mjs';

const denied = /접근 권한|not-found/;
const actions = f => f.load('src/features/recipients/actions.ts');

test('deletion is manage-only, preserves records and blocks every normal record and AI path', async t => {
  const f = await workspaceFixture(t); const management = actions(f);
  const id = await f.createRecipient('합성 삭제');
  const kept = await f.createRecipient('합성 유지');
  await f.actions.saveDailyRecord(id, '보존할 합성 기록', '', '2026-11-02');
  await f.actions.saveWeeklyReport(id, '보존할 합성 주간');
  const rows = await f.db.select().from(f.schema.records).where(eq(f.schema.records.recipientId, id));
  await f.grantRecipientAccess(id, 'bob', 'edit');
  f.login('bob'); await assert.rejects(management.deleteRecipient(id), denied);
  f.login('charlie'); await assert.rejects(management.deleteRecipient(id), denied);
  f.login(null); await assert.rejects(management.deleteRecipient(id), /login-required/);
  f.login('alice'); await management.deleteRecipient(id);
  assert.equal((await f.db.select().from(f.schema.recipients).where(eq(f.schema.recipients.id, id)).get()).isActive, false);
  assert.deepEqual(await f.db.select().from(f.schema.records).where(eq(f.schema.records.recipientId, id)), rows);
  assert.deepEqual((await f.listing()).items.map(row => row.id), [kept]);
  const reads = f.load('src/app/(main)/recipients/[id]/queries.ts');
  for (const run of [
    () => reads.getRecipientOr404(id), () => reads.getRecipientRecords(id),
    () => f.actions.saveDailyRecord(id, '침입', '', '2026-11-03'),
    () => f.actions.generateDraft('합성 입력', id), () => f.actions.generateWeeklyDraft(id),
    () => f.actions.generateWeeklyReportBackground(id, '2026-11-02'),
    () => f.actions.getWeeklyRecord(rows.find(row => row.type === 'weekly').id),
    () => f.actions.updateDailyRecord(rows.find(row => row.type === 'daily').id, '침입', ''),
    () => f.actions.deleteRecord(rows[0].id), () => management.deleteRecipient(id),
  ]) await assert.rejects(run(), denied);
  const route = f.load('src/app/api/generate-daily/route.ts');
  const response = await route.POST(new Request('https://synthetic.invalid/api/generate-daily', { method: 'POST', body: JSON.stringify({ recipientId: id, keywords: '합성 입력' }) }));
  assert.equal(response.status, 404); assert.equal(f.aiCalls(), 0);
  f.login('bob'); assert.deepEqual((await f.listing()).items, []);
  await assert.rejects(f.access.requireRecipient('bob', id), denied);
});

test('deleting during background generation prevents saving its result', async t => {
  let f; let id;
  f = await workspaceFixture(t, { generateWeekly: async () => { await actions(f).deleteRecipient(id); return '저장되면 안 되는 합성 결과'; } });
  id = await f.createRecipient('합성 작업중 삭제');
  await f.actions.saveDailyRecord(id, '합성 기록', '', '2026-11-02');
  const report = await f.actions.generateWeeklyReportBackground(id, '2026-11-02');
  await f.callbacks[0]();
  const row = await f.db.select().from(f.schema.records).where(eq(f.schema.records.id, report.recordId)).get();
  assert.equal(row.status, 'FAILED'); assert.equal(row.combinedContent, null);
});
