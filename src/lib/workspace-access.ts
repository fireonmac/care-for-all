import { randomUUID } from 'node:crypto';
import { and, eq, getTableColumns, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { writeTransaction } from '@/db/transaction';
import { recipients, records, recipientShares, workspaceMembers, workspaces } from '@/db/schema';
import { requireSession } from '@/lib/auth';

export class AccessDeniedError extends Error {
  constructor() { super('자료를 찾을 수 없거나 접근 권한이 없습니다.'); }
}

export async function requireActor() {
  const session = await requireSession();
  if (!session.user.emailVerified) throw new AccessDeniedError();
  return session.user;
}

// 고유 키와 트랜잭션으로 동시 최초 요청을 합친다. 기존 공간의 멤버십을 임의 복구하지 않는다.
export async function ensureDefaultWorkspace(userId: string) {
  return writeTransaction(async tx => {
    const created = await tx.insert(workspaces).values({ id: randomUUID(), provisionedForUserId: userId, createdAt: new Date() })
      .onConflictDoNothing({ target: workspaces.provisionedForUserId }).returning({ id: workspaces.id });
    const workspace = await tx.select().from(workspaces).where(eq(workspaces.provisionedForUserId, userId)).get();
    if (!workspace) throw new Error('기본 공간을 만들지 못했습니다. 다시 시도해주세요.');
    if (created.length) await tx.insert(workspaceMembers).values({ workspaceId: workspace.id, userId });
    return workspace;
  });
}

// 공간 소속, 작성자, 자료별 권한을 분리한다. 구성원 자격만으로는 자료를 볼 수 없다.
export function recipientAccess(userId: string, permission: 'read' | 'edit' | 'manage' = 'read') {
  const member = sql`exists (select 1 from ${workspaceMembers}
    where ${workspaceMembers.workspaceId} = ${recipients.workspaceId} and ${workspaceMembers.userId} = ${userId})`;
  const shared = sql`exists (select 1 from ${recipientShares}
    where ${recipientShares.recipientId} = ${recipients.id} and ${recipientShares.userId} = ${userId}
    and ${permission === 'edit' ? eq(recipientShares.permission, 'edit') : sql`1`})`;
  const creator = eq(recipients.createdByUserId, userId);
  return and(isNotNull(recipients.workspaceId), member, permission === 'manage' ? creator : or(creator, shared))!;
}

export function recordAccess(userId: string, permission: 'read' | 'edit' = 'read') {
  const inScope = (mode: 'read' | 'edit') => inArray(records.recipientId,
    db.select({ id: recipients.id }).from(recipients).where(recipientAccess(userId, mode)));
  // 작성자는 읽기 권한을 유지하는 동안 자신의 과거 기록을 수정할 수 있다.
  return permission === 'read' ? inScope('read')
    : or(inScope('edit'), and(inScope('read'), eq(records.createdByUserId, userId)))!;
}

export async function requireRecipient(userId: string, recipientId: string, permission: 'read' | 'edit' | 'manage' = 'read') {
  const recipient = await db.select({ ...getTableColumns(recipients),
    canEdit: sql<boolean>`${recipientAccess(userId, 'edit')}`.mapWith(Boolean),
    canManage: sql<boolean>`${recipientAccess(userId, 'manage')}`.mapWith(Boolean),
  }).from(recipients).where(and(eq(recipients.id, recipientId), recipientAccess(userId, permission))).get();
  if (!recipient) throw new AccessDeniedError();
  return recipient;
}

export const recordFields = (userId: string) => ({ ...getTableColumns(records),
  canEdit: sql<boolean>`${recordAccess(userId, 'edit')}`.mapWith(Boolean),
});
