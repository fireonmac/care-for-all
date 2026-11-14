import test from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { workspaceFixture } from './workspace-fixture.mjs';
const denied = /접근 권한/;
const management = f => f.load('src/features/recipients/actions.ts');

test('rename changes only the name and retains the recipient identity, records and shares', async t => {
  const f = await workspaceFixture(t); const id = await f.createRecipient('합성 기존');
  await f.actions.saveDailyRecord(id, '합성 원문', '', '2026-11-09');
  await f.grantRecipientAccess(id, 'bob', 'edit');
  const before = await f.db.select().from(f.schema.records);
  const shares = await f.db.select().from(f.schema.recipientShares);
  const result = await management(f).renameRecipient(id, { name: '  합성   새이름  ', workspaceId: 'spoofed' });
  assert.equal(result.status, 'updated'); assert.equal(result.name, '합성 새이름'); assert.equal(result.id, id);
  assert.deepEqual(await f.db.select().from(f.schema.records), before);
  assert.deepEqual(await f.db.select().from(f.schema.recipientShares), shares);
  assert.equal((await f.listing('합성 새이름')).items[0].id, id);
});

test('rename excludes itself and warns before assigning a duplicate name suffix', async t => {
  const f = await workspaceFixture(t); const one = await f.createRecipient('합성 하나');
  const two = await f.createRecipient('합성 둘'); const rename = management(f).renameRecipient;
  assert.equal((await rename(one, { name: '합성 하나' })).status, 'updated');
  const result = await rename(two, { name: '합성 하나' });
  assert.equal(result.status, 'duplicate'); assert.deepEqual(result.matches.map(row => row.id), [one]);
  assert.equal((await f.access.requireRecipient('alice', two)).name, '합성 둘');
  const saved = await rename(two, { name: '합성 하나', confirmDuplicate: true });
  assert.equal(saved.name, '합성 하나 (2)');
  assert.equal((await rename(two, { name: saved.name })).name, saved.name);
  assert.equal((await rename(two, { name: '  ' })).status, 'invalid');
});

test('shared editors and other workspaces cannot rename a recipient', async t => {
  const f = await workspaceFixture(t); const id = await f.createRecipient('합성 관리');
  await f.grantRecipientAccess(id, 'bob', 'edit');
  for (const actor of ['bob', 'charlie']) {
    f.login(actor); await assert.rejects(management(f).renameRecipient(id, { name: '침입' }), denied);
  }
  f.login('alice'); assert.equal((await f.access.requireRecipient('alice', id)).name, '합성 관리');
  await management(f).deleteRecipient(id);
  await assert.rejects(management(f).renameRecipient(id, { name: '삭제 후 수정' }), denied);
  assert.equal((await f.db.select().from(f.schema.recipients).where(eq(f.schema.recipients.id, id)).get()).name, '합성 관리');
});
