'use server';

import { recipients, workspaceMembers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { writeTransaction } from '@/db/transaction';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { AccessDeniedError, requireActor, ensureDefaultWorkspace } from '@/lib/workspace-access';

import { insertRecipientSchema } from '@/features/recipients/types';

export async function addRecipient(payload: unknown) {
  const actor = await requireActor();

  const result = insertRecipientSchema.safeParse(payload);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }
  
  const { name } = result.data;
  const workspace = await ensureDefaultWorkspace(actor.id);
  
  await writeTransaction(async tx => {
    const member = await tx.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, actor.id))).get();
    if (!member) throw new AccessDeniedError();
    await tx.insert(recipients).values({
      id: randomUUID(),
      name: name.trim(),
      workspaceId: workspace.id,
      createdByUserId: actor.id,
      createdAt: new Date(),
      isActive: true,
    });
  });

  revalidatePath('/');
  return { success: true };
}
