'use client';

import { useEffect, useRef, useState, type ReactElement, type RefObject } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { insertRecipientSchema } from '../types';
import { recipientQueryKeys } from '../queryKeys';
import { useSaveRecipientName } from './useRecipientMutations';
import { DuplicateRecipientReview, type DuplicateRegistration } from './DuplicateRecipientReview';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogBody } from '@/components/ui/dialog';

export function RecipientNameDialog({ open, onOpenChange, recipient, trigger, finalFocus }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient?: { id: string; name: string };
  trigger?: ReactElement;
  finalFocus?: RefObject<HTMLButtonElement | null>;
}) {
  const [review, setReview] = useState<DuplicateRegistration | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSaveRecipientName(recipient?.id);
  const form = useForm<z.infer<typeof insertRecipientSchema>>({
    resolver: zodResolver(insertRecipientSchema), defaultValues: { name: recipient?.name ?? '' },
  });
  const nameField = form.register('name');
  useEffect(() => { if (open) form.reset({ name: recipient?.name ?? '' }); }, [open, recipient?.name, form]);
  useEffect(() => { if (open && !review) form.setFocus('name'); }, [open, review, form]);

  function closeForm(savedName?: string) {
    onOpenChange(false);
    mutation.reset();
    form.reset({ name: savedName ?? recipient?.name ?? '' });
    setReview(null);
  }

  function submit(confirmDuplicate = false) {
    return form.handleSubmit(data => {
      if (mutation.isPending) return;
      mutation.mutate({ ...data, confirmDuplicate }, {
        onSuccess: async result => {
          if (result.status === 'duplicate') { setReview(result); return; }
          await queryClient.invalidateQueries({ queryKey: recipientQueryKeys.all });
          closeForm(recipient ? result.name : '');
          router.refresh();
        },
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={value => {
      if (mutation.isPending) return;
      if (value) onOpenChange(true); else closeForm();
    }}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent initialFocus={nameInputRef} finalFocus={finalFocus}>
        <DialogHeader><DialogTitle>{review ? '중복 이름 확인' : recipient ? '이름 수정' : '어르신 등록'}</DialogTitle></DialogHeader>
        <DialogBody>
          {review ? <DuplicateRecipientReview review={review} /> : (
            <form id="recipient-name-form" onSubmit={submit()} className="flex flex-col gap-3">
              <label htmlFor="recipient-name" className="sr-only">어르신 이름</label>
              <Input id="recipient-name" type="text" {...nameField} ref={element => { nameField.ref(element); nameInputRef.current = element; }}
                aria-invalid={!!form.formState.errors.name} aria-describedby={form.formState.errors.name ? 'recipient-name-error' : undefined}
                placeholder="성함을 입력하세요" className="h-14 border text-lg font-normal" />
              {form.formState.errors.name && <p id="recipient-name-error" role="alert" className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
            </form>
          )}
          {mutation.isError && <p className="mt-4 text-sm text-destructive" role="alert">{mutation.error.message}</p>}
        </DialogBody>
        <DialogFooter showCloseButton={false}>
          {review ? <>
            <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={mutation.isPending} onClick={() => { setReview(null); mutation.reset(); }}>뒤로</Button>
            <Button type="button" className="w-full sm:w-auto" disabled={mutation.isPending} onClick={() => void submit(true)()}>{mutation.isPending ? '저장 중...' : recipient ? '이 이름으로 저장' : '계속 등록'}</Button>
          </> : <>
            <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={mutation.isPending} onClick={() => closeForm()}>취소</Button>
            <Button type="submit" form="recipient-name-form" className="w-full sm:w-auto" disabled={mutation.isPending}>{mutation.isPending ? '저장 중...' : recipient ? '저장' : '등록'}</Button>
          </>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
