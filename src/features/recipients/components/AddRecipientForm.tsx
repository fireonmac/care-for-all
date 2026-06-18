'use client';

import { useEffect, useState } from 'react';
import { addRecipient } from '@/features/recipients/actions';

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
  const [name, setName] = useState('');
  const queryClient = useQueryClient();

  const {
    mutate,
    reset,
    isError,
    isPending,
    error,
  } = useMutation({
    mutationFn: async (submittedName: string) => {
      const result = await addRecipient(submittedName);

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
      setName('');
    },
  });

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName || isPending) return;

    reset();
    mutate(trimmedName);
  };

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
          <form id="add-recipient-form" onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div>
              <Input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="어르신 성함을 입력하세요"
                className="text-xl"
                required
              />
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
