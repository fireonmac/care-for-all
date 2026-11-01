'use server';

import { and, eq, sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { writeTransaction } from '@/db/transaction';
import { recipients, recipientShares, user, workspaceMembers } from '@/db/schema';
import { AccessDeniedError, recipientAccess, requireActor, requireRecipient } from '@/lib/workspace-access';

const shareInput = createInsertSchema(recipientShares).pick({ permission: true }).extend({ email: z.email().max(254) });

export async function getRecipientShares(recipientId: string) {
  const actor = await requireActor();
  await requireRecipient(actor.id, recipientId, 'manage');
  return db.select({ userId: recipientShares.userId, email: user.email, permission: recipientShares.permission })
    .from(recipientShares).innerJoin(user, eq(user.id, recipientShares.userId)).where(eq(recipientShares.recipientId, recipientId));
}

export async function shareRecipient(recipientId: string, payload: unknown) {
  const actor = await requireActor();
  const input = shareInput.parse(payload);
  await writeTransaction(async (tx) => {
    const recipient = await tx.select().from(recipients).where(and(eq(recipients.id, recipientId), recipientAccess(actor.id, 'manage'))).get();
    if (!recipient?.workspaceId) throw new AccessDeniedError();
    const target = await tx.select({ id: user.id }).from(user)
      .where(and(sql`lower(${user.email}) = ${input.email.trim().toLowerCase()}`, eq(user.emailVerified, true))).get();
    if (!target) throw new Error('상대방이 먼저 Google 계정으로 가입한 뒤 다시 시도해주세요.');
    if (target.id === actor.id) throw new Error('본인은 이미 관리 권한이 있습니다.');
    await tx.insert(workspaceMembers).values({ workspaceId: recipient.workspaceId, userId: target.id }).onConflictDoNothing();
    await tx.insert(recipientShares).values({ recipientId, userId: target.id, permission: input.permission })
      .onConflictDoUpdate({ target: [recipientShares.recipientId, recipientShares.userId], set: { permission: input.permission } });
  });
  revalidatePath(`/recipients/${recipientId}`);
}

export async function revokeRecipientShare(recipientId: string, userId: string) {
  const actor = await requireActor();
  await writeTransaction(async (tx) => {
    const allowed = await tx.select({ id: recipients.id }).from(recipients)
      .where(and(eq(recipients.id, recipientId), recipientAccess(actor.id, 'manage'))).get();
    if (!allowed) throw new AccessDeniedError();
    await tx.delete(recipientShares).where(and(eq(recipientShares.recipientId, recipientId), eq(recipientShares.userId, userId)));
  });
  // 다른 대상자를 공유받았을 수 있으므로 공간 구성원 관계는 지우지 않는다.
  revalidatePath(`/recipients/${recipientId}`);
}
