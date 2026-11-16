'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { RecipientNameDialog } from './RecipientNameDialog';
import { useDeleteRecipient } from './useRecipientMutations';
import { recipientQueryKeys } from '../queryKeys';

export function RecipientActions({ recipientId, recipientName }: { recipientId: string; recipientName: string }) {
  const [dialog, setDialog] = useState<'rename' | 'delete' | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const mutation = useDeleteRecipient();
  const queryClient = useQueryClient();
  const router = useRouter();

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button ref={triggerRef} type="button" variant="secondary" size="icon" className="size-10 rounded-lg text-muted-foreground" aria-label="어르신 관리 메뉴"><MoreVertical size={20} /></Button>} />
      <DropdownMenuContent align="end" finalFocus={dialog ? false : triggerRef} className="w-44 p-1.5">
        <DropdownMenuItem className="min-h-11 px-3 text-base" onClick={() => setDialog('rename')}><Pencil aria-hidden="true" />이름 수정</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="min-h-11 px-3 text-base" onClick={() => { mutation.reset(); setDialog('delete'); }}><Trash2 aria-hidden="true" />삭제</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <RecipientNameDialog key={recipientId} open={dialog === 'rename'} onOpenChange={open => setDialog(open ? 'rename' : null)} recipient={{ id: recipientId, name: recipientName }} finalFocus={triggerRef} />
    <ConfirmDeleteModal open={dialog === 'delete'} onOpenChange={open => { if (!mutation.isPending) setDialog(open ? 'delete' : null); }}
      title="어르신 삭제" message={`${recipientName} 어르신을 삭제할까요?\n삭제 후에는 어르신과 기록을 확인할 수 없습니다.`}
      isLoading={mutation.isPending} error={mutation.isError ? mutation.error.message : undefined} finalFocus={triggerRef}
      onConfirm={() => mutation.mutate(recipientId, { onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: recipientQueryKeys.all });
        router.replace('/'); router.refresh();
      } })} />
  </>;
}
