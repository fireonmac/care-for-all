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

export async function addRecipient(payload: unknown) {
  const actor = await requireActor();
  const parsed = recipientRegistrationSchema.safeParse(payload);
  if (!parsed.success) return { status: 'invalid' as const, error: parsed.error.issues[0].message };
  const name = normalizeRecipientName(parsed.data.name);
  const workspace = await ensureDefaultWorkspace(actor.id);
  const result = await writeTransaction(async tx => {
    const member = await tx.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, actor.id))).get();
    if (!member) throw new AccessDeniedError();
    // 검사와 번호 배정/생성을 같은 쓰기 트랜잭션에 둬 동시 등록도 서로 다른 번호를 받는다.
    const existing = await tx.select({ id: recipients.id, name: recipients.name }).from(recipients)
      .where(and(eq(recipients.workspaceId, workspace.id), eq(recipients.isActive, true)));
    const matches = existing.filter(row => recipientNameFamily(row.name) === recipientNameFamily(name));
    const nextName = nextRecipientName(name, matches.map(row => row.name));
    if (matches.length && !parsed.data.confirmDuplicate) {
      const { weekDates, startOfWeek, endOfWeek } = getWeekData(getKSTDateStr());
      // 이름 충돌은 기관 전체에서 검사하지만, 경고에는 읽을 수 있는 자료만 포함한다.
      const visible = await tx.select({ id: recipients.id, name: recipients.name }).from(recipients)
        .where(and(inArray(recipients.id, matches.map(row => row.id)), recipientAccess(actor.id)));
      const daily = visible.length ? await tx.select({ recipientId: records.recipientId, date: records.date }).from(records)
        .where(and(inArray(records.recipientId, visible.map(row => row.id)), recordAccess(actor.id),
          eq(records.type, 'daily'), gte(records.date, startOfWeek), lte(records.date, endOfWeek))) : [];
      return { status: 'duplicate' as const, suggestedName: nextName, weekDates,
        matches: visible.map(row => ({ ...row, weeklyRecords: daily.filter(record => record.recipientId === row.id).map(record => record.date) })) };
    }
    const id = randomUUID();
    await tx.insert(recipients).values({ id, name: nextName, workspaceId: workspace.id,
      createdByUserId: actor.id, createdAt: new Date(), isActive: true });
    return { status: 'created' as const, success: true, id, name: nextName };
  });
  if (result.status === 'created') revalidatePath('/');
  return result;
}
