'use server';

import { recipients, records, workspaceMembers } from '@/db/schema';
import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import { writeTransaction } from '@/db/transaction';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { AccessDeniedError, requireActor, ensureDefaultWorkspace, recipientAccess, recordAccess } from '@/lib/workspace-access';
import { getKSTDateStr, getWeekData } from '@/lib/dateUtils';
import { recipientRegistrationSchema } from './types';
import { nextRecipientName, normalizeRecipientName, recipientNameFamily } from './names';

type Transaction = Parameters<Parameters<typeof writeTransaction>[0]>[0];

async function resolveName(tx: Transaction, actorId: string, workspaceId: string, name: string, confirmed: boolean, excludeId?: string) {
  const existing = await tx.select({ id: recipients.id, name: recipients.name }).from(recipients)
    .where(and(eq(recipients.workspaceId, workspaceId), eq(recipients.isActive, true)));
  const matches = existing.filter(row => row.id !== excludeId && recipientNameFamily(row.name) === recipientNameFamily(name));
  const nextName = nextRecipientName(name, matches.map(row => row.name));
  if (!matches.length || confirmed) return { status: 'available' as const, name: nextName };
  const todayStr = getKSTDateStr();
  const { weekDates, startOfWeek, endOfWeek } = getWeekData(todayStr);
  const visible = await tx.select({ id: recipients.id, name: recipients.name }).from(recipients)
    .where(and(inArray(recipients.id, matches.map(row => row.id)), recipientAccess(actorId)));
  const daily = visible.length ? await tx.select({ recipientId: records.recipientId, date: records.date }).from(records)
    .where(and(inArray(records.recipientId, visible.map(row => row.id)), recordAccess(actorId),
      eq(records.type, 'daily'), gte(records.date, startOfWeek), lte(records.date, endOfWeek))) : [];
  return { status: 'duplicate' as const, suggestedName: nextName, weekDates, todayStr,
    matches: visible.map(row => ({ ...row, weeklyRecords: daily.filter(record => record.recipientId === row.id).map(record => record.date) })) };
}

export async function addRecipient(payload: unknown) {
  const actor = await requireActor();
  const parsed = recipientRegistrationSchema.safeParse(payload);
  if (!parsed.success) return { status: 'invalid' as const, error: parsed.error.issues[0].message };
  const workspace = await ensureDefaultWorkspace(actor.id);
  const result = await writeTransaction(async tx => {
    const member = await tx.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, actor.id))).get();
    if (!member) throw new AccessDeniedError();
    const resolved = await resolveName(tx, actor.id, workspace.id, normalizeRecipientName(parsed.data.name), parsed.data.confirmDuplicate);
    if (resolved.status === 'duplicate') return resolved;
    const id = randomUUID();
    await tx.insert(recipients).values({ id, name: resolved.name, workspaceId: workspace.id,
      createdByUserId: actor.id, createdAt: new Date(), isActive: true });
    return { status: 'created' as const, success: true, id, name: resolved.name };
  });
  if (result.status === 'created') revalidatePath('/');
  return result;
}

export async function renameRecipient(recipientId: string, payload: unknown) {
  const actor = await requireActor();
  const parsed = recipientRegistrationSchema.safeParse(payload);
  if (!parsed.success) return { status: 'invalid' as const, error: parsed.error.issues[0].message };
  const result = await writeTransaction(async tx => {
    const recipient = await tx.select().from(recipients)
      .where(and(eq(recipients.id, recipientId), recipientAccess(actor.id, 'manage'))).get();
    if (!recipient?.workspaceId) throw new AccessDeniedError();
    const name = normalizeRecipientName(parsed.data.name);
    if (name === recipient.name) return { status: 'updated' as const, id: recipient.id, name };
    const resolved = await resolveName(tx, actor.id, recipient.workspaceId, name, parsed.data.confirmDuplicate, recipient.id);
    if (resolved.status === 'duplicate') return resolved;
    await tx.update(recipients).set({ name: resolved.name }).where(eq(recipients.id, recipient.id));
    return { status: 'updated' as const, id: recipient.id, name: resolved.name };
  });
  if (result.status === 'updated') { revalidatePath('/'); revalidatePath(`/recipients/${recipientId}`); }
  return result;
}

export async function deleteRecipient(recipientId: string) {
  const actor = await requireActor();
  // 기록은 보존하고 모든 조회/쓰기/AI 경로에서 제외한다. 편집 공유만으로는 삭제할 수 없다.
  const removed = await writeTransaction(async tx => tx.update(recipients).set({ isActive: false })
    .where(and(eq(recipients.id, recipientId), recipientAccess(actor.id, 'manage'))).returning({ id: recipients.id }));
  if (!removed.length) throw new AccessDeniedError();
  revalidatePath('/');
  return { success: true };
}
