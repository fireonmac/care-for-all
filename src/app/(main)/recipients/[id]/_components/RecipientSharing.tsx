'use client';

import { useActionState } from 'react';
import { shareRecipient, revokeRecipientShare, getRecipientShares } from '@/features/recipients/sharing';
import { Button } from '@/components/ui/button';

type Props = { recipientId: string; shares: Awaited<ReturnType<typeof getRecipientShares>> };

export function RecipientSharing({ recipientId, shares }: Props) {
  const [message, submit, pending] = useActionState(async (_: string | null, form: FormData) => {
    try {
      const revoke = form.get('revoke');
      if (typeof revoke === 'string') await revokeRecipientShare(recipientId, revoke);
      else await shareRecipient(recipientId, { email: form.get('email'), permission: form.get('permission') });
      return '공유 권한을 저장했습니다.';
    } catch {
      return '공유 권한을 저장하지 못했습니다. 상대방의 가입 여부와 이메일, 본인의 관리 권한을 확인해주세요.';
    }
  }, null);
  return (
    <details className="mb-8 rounded-lg border border-border p-4">
      <summary className="cursor-pointer font-medium">이 대상자 자료 공유</summary>
      <p className="my-3 text-sm text-muted-foreground">가입한 Google 이메일로 이 대상자와 연결된 모든 일일·주간 기록만 공유합니다. 다른 대상자는 공유되지 않습니다.</p>
      <form action={submit} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">Google 이메일<input className="rounded border border-border bg-background p-2" name="email" type="email" maxLength={254} required /></label>
        <label className="flex flex-col gap-1">권한<select name="permission" className="rounded border border-border bg-background p-2"><option value="read">읽기</option><option value="edit">편집·AI 생성</option></select></label>
        <Button disabled={pending} type="submit">공유</Button>
      </form>
      <ul className="mt-4 space-y-2">
        {shares.map(share => <li key={share.userId} className="flex flex-wrap items-center gap-3">
          <span>{share.email} · {share.permission === 'edit' ? '편집' : '읽기'}</span>
          <form action={submit}><Button type="submit" name="revoke" value={share.userId} disabled={pending} variant="secondary">공유 해제</Button></form>
        </li>)}
      </ul>
      {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    </details>
  );
}
