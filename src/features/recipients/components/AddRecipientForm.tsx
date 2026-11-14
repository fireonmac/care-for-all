'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { insertRecipientSchema } from '@/features/recipients/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { recipientQueryKeys } from '@/features/recipients/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { useRegisterRecipient } from './useRecipientMutations';
import { DuplicateRecipientReview, type DuplicateRegistration } from './DuplicateRecipientReview';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogBody,
} from '@/components/ui/dialog';

export function AddRecipientForm() {
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState<DuplicateRegistration | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const registration = useRegisterRecipient();
  const form = useForm<z.infer<typeof insertRecipientSchema>>({
    resolver: zodResolver(insertRecipientSchema), defaultValues: { name: '' },
  });
  const nameField = form.register('name');
  const { reset } = registration;

  useEffect(() => {
    if (open && !review) form.setFocus('name');
  }, [open, review, form]);

  function closeForm() {
    setOpen(false);
    reset();
    form.reset();
    setReview(null);
  }

  function submit(confirmDuplicate = false) {
    return form.handleSubmit(data => {
      if (registration.isPending) return;
      registration.mutate({ ...data, confirmDuplicate }, {
        onSuccess: async result => {
          if (result.status === 'duplicate') { setReview(result); return; }
          await queryClient.invalidateQueries({ queryKey: recipientQueryKeys.all });
          closeForm();
        },
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={value => {
      if (registration.isPending) return;
      if (value) setOpen(true); else closeForm();
    }}>
      <DialogTrigger render={<Button type="button" variant="ghost" className="whitespace-nowrap px-2 sm:px-6 text-base sm:text-lg">+ 새 어르신 추가</Button>} />
      <DialogContent initialFocus={nameInputRef} className="max-h-[85dvh] w-[calc(100%_-_2rem)]">
        <DialogHeader><DialogTitle>{review ? '같은 이름의 어르신 확인' : '어르신 등록'}</DialogTitle></DialogHeader>
        <DialogBody>
          {review ? <DuplicateRecipientReview review={review} /> : (
            <form id="add-recipient-form" onSubmit={submit()} className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <Input type="text" {...nameField} ref={element => { nameField.ref(element); nameInputRef.current = element; }}
                  aria-label="어르신 이름" aria-invalid={!!form.formState.errors.name}
                  aria-describedby={form.formState.errors.name ? 'recipient-name-error' : undefined}
                  placeholder="어르신 성함을 입력하세요" className="text-xl" />
                {form.formState.errors.name && <p id="recipient-name-error" role="alert" className="text-sm font-medium text-destructive">{form.formState.errors.name.message}</p>}
              </div>
            </form>
          )}
          {registration.isError && <p className="mt-4 text-sm font-medium text-destructive" role="alert">{registration.error.message}</p>}
        </DialogBody>
        <DialogFooter showCloseButton={!review && !registration.isPending} className="gap-3">
          {review ? <>
            <Button type="button" variant="secondary" className="w-full px-4 sm:w-auto" disabled={registration.isPending} onClick={() => { setReview(null); registration.reset(); }}>이름 수정</Button>
            <Button type="button" className="w-full px-4 sm:w-auto" disabled={registration.isPending} onClick={() => void submit(true)()}>{registration.isPending ? '추가 중...' : '다른 어르신으로 추가'}</Button>
          </> : <Button type="submit" form="add-recipient-form" disabled={registration.isPending}>{registration.isPending ? '확인 중...' : '추가하기'}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
