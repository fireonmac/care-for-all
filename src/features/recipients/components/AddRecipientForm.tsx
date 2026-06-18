'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addRecipient } from '@/features/recipients/actions';
import { insertRecipientSchema } from '@/features/recipients/types';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { recipientQueryKeys } from '@/features/recipients/queryKeys';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger, DialogBody
} from '@/components/ui/dialog';

export function AddRecipientForm() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof insertRecipientSchema>>({
    resolver: zodResolver(insertRecipientSchema),
    defaultValues: { name: '' },
  });

  const {
    mutate,
    reset,
    isError,
    isPending,
    error,
  } = useMutation({
    mutationFn: async (payload: unknown) => {
      const result = await addRecipient(payload);

      if (!result.success) {
        throw new Error(result.error ?? '어르신 등록에 실패했습니다.');
      }

      return result;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: recipientQueryKeys.all,
      });
      setOpen(false);
      form.reset();
    },
  });

  useEffect(() => {
    if (!open) {
      reset();
      form.reset();
    }
  }, [open, reset, form]);

  const onSubmit = form.handleSubmit((data) => {
    if (isPending) return;
    reset();
    mutate(data);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="ghost">
            + 새 어르신 추가
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>어르신 등록</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <form id="add-recipient-form" onSubmit={onSubmit} className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <Input
                type="text"
                {...form.register('name')}
                placeholder="어르신 성함을 입력하세요"
                className="text-xl"
              />
              {form.formState.errors.name && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            {isError && (
              <p className="text-sm font-medium text-destructive" role="alert">
                {error instanceof Error
                  ? error.message
                  : '어르신 등록에 실패했습니다.'}
              </p>
            )}
          </form>
        </DialogBody>

        <DialogFooter>
          <Button
            type="submit"
            form="add-recipient-form"
            disabled={isPending}
          >
            {isPending ? '추가 중...' : '추가하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
