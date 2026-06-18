'use server';

import { db } from '@/db';
import { recipients } from '@/db/schema';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';

import { insertRecipientSchema } from '@/features/recipients/types';

export async function addRecipient(payload: unknown) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  const result = insertRecipientSchema.safeParse(payload);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }
  
  const { name } = result.data;
  
  await db.insert(recipients).values({
    id: randomUUID(),
    name: name.trim(),
    createdAt: new Date(),
    isActive: true,
  });

  revalidatePath('/');
  return { success: true };
}

