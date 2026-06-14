'use server';

import { db } from '@/db';
import { recipients } from '@/db/schema';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';

export async function addRecipient(name: string) {
  if (!name.trim()) return { error: '성함을 입력해주세요.' };
  
  await db.insert(recipients).values({
    id: randomUUID(),
    name: name.trim(),
    createdAt: new Date(),
    isActive: true,
  });

  revalidatePath('/');
  return { success: true };
}
