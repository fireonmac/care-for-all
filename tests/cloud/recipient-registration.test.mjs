import test from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { workspaceFixture } from './workspace-fixture.mjs';

const actions = f => f.load('src/features/recipients/actions.ts');

test('duplicate registration shows only scoped links and current-week dates without creating a row', async t => {
  const f = await workspaceFixture(t);
  const id = await f.createRecipient('합성 어르신');
  const { getKSTDateStr, getWeekData, addCalendarDays } = f.load('src/lib/dateUtils.ts');
  const week = getWeekData(getKSTDateStr());
  await f.actions.saveDailyRecord(id, '합성 내용은 등록 경고에 노출하지 않음', '', week.startOfWeek);
  await f.actions.saveDailyRecord(id, '이전 주 합성 기록', '', addCalendarDays(week.startOfWeek, -1));
  const before = await f.db.select().from(f.schema.recipients);
  const result = await actions(f).addRecipient({ name: '  합성   어르신  ' });
  assert.equal(result.status, 'duplicate');
  assert.equal(result.suggestedName, '합성 어르신 (2)');
  assert.deepEqual(result.matches, [{ id, name: '합성 어르신', weeklyRecords: [week.startOfWeek] }]);
  assert.equal(result.weekDates.length, 7);
  assert.equal(JSON.stringify(result).includes('노출하지'), false);
  assert.deepEqual(await f.db.select().from(f.schema.recipients), before);
  assert.equal((await actions(f).addRecipient({ name: '　 \t ' })).status, 'invalid');
});

test('confirmation assigns available numbers inside the transaction including concurrent submissions', async t => {
  const f = await workspaceFixture(t); const add = actions(f).addRecipient;
  await f.createRecipient('합성 번호');
  const created = await Promise.all(Array.from({ length: 5 }, () => add({ name: '합성 번호', confirmDuplicate: true })));
  assert.ok(created.every(row => row.status === 'created'));
  assert.deepEqual(created.map(row => row.name).sort(), [2, 3, 4, 5, 6].map(n => `합성 번호 (${n})`));
  assert.equal((await add({ name: '합성 번호 (2)' })).status, 'duplicate');
  const next = await add({ name: '합성 번호', confirmDuplicate: true });
  assert.equal(next.name, '합성 번호 (7)');
  assert.equal(new Set((await f.listing()).items.map(row => row.name)).size, 7);
  f.login('bob');
  const other = await add({ name: '합성 번호', workspaceId: 'spoofed' });
  assert.equal(other.status, 'created'); assert.equal(other.name, '합성 번호');
});

test('another member can detect name collisions without learning unreadable recipient IDs or records', async t => {
  const f = await workspaceFixture(t); const add = actions(f).addRecipient;
  const hidden = await f.createRecipient('합성 비공개');
  const aliceSpace = await f.access.ensureDefaultWorkspace('alice');
  const bobSpace = await f.access.ensureDefaultWorkspace('bob');
  await f.db.update(f.schema.recipients).set({ workspaceId: bobSpace.id }).where(eq(f.schema.recipients.id, hidden));
  await f.db.insert(f.schema.workspaceMembers).values({ workspaceId: bobSpace.id, userId: 'alice' });
  f.login('bob');
  const result = await add({ name: '합성 비공개' });
  assert.equal(result.status, 'duplicate'); assert.deepEqual(result.matches, []);
  assert.equal(JSON.stringify(result).includes(hidden), false);
  const own = await add({ name: '합성 비공개', confirmDuplicate: true });
  assert.equal(own.name, '합성 비공개 (2)');
  assert.notEqual(bobSpace.id, aliceSpace.id);
});

