'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { recipientQueryKeys } from '../queryKeys';
import { useDeleteRecipient } from './useRecipientMutations';

export function DeleteRecipient({ recipientId, recipientName }: { recipientId: string; recipientName: string }) {
  const [confirming, setConfirming] = useState(false);
  const mutation = useDeleteRecipient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  useEffect(() => {
    if (confirming) cancelButtonRef.current?.focus();
    else if (wasConfirming.current) deleteButtonRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  return (
    <section aria-label="어르신 관리" className="mt-16 border-t border-border pt-6">
      {confirming ? <div role="group" aria-label="어르신 삭제 확인" className="flex flex-col gap-4">
        <p className="font-medium">{recipientName} 어르신을 삭제할까요?</p>
        <p className="text-sm text-muted-foreground">목록에서 사라지고 더 이상 기록을 조회하거나 작성할 수 없습니다. 기존 기록은 보관됩니다.</p>
        <div className="flex flex-wrap gap-3">
          <Button ref={cancelButtonRef} type="button" variant="secondary" disabled={mutation.isPending} onClick={() => { setConfirming(false); mutation.reset(); }}>취소</Button>
          <Button type="button" variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate(recipientId, {
            onSuccess: async () => {
              await queryClient.invalidateQueries({ queryKey: recipientQueryKeys.all });
              router.replace('/');
              router.refresh();
            },
          })}>{mutation.isPending ? '삭제 중...' : '어르신 삭제'}</Button>
        </div>
        {mutation.isError && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
      </div> : <Button ref={deleteButtonRef} type="button" variant="ghost" className="text-destructive" onClick={() => setConfirming(true)}>어르신 삭제</Button>}
    </section>
  );
}
