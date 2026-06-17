'use server';

import { db } from '@/db';
import { recipients } from '@/db/schema';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';

export async function addRecipient(name: string) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

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

