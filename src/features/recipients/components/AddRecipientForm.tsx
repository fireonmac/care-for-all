'use client';

import { useEffect, useState } from 'react';
import { Modal, ModalClose } from '@/components/Modal';
import { Dialog } from '@base-ui/react';
import { addRecipient } from '@/app/actions';
import { commonInputClasses } from '@/components/Textarea';
import { recipientQueryKeys } from '@/features/recipients/queryKeys';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="어르신 등록"
      trigger={
        <Dialog.Trigger className="text-base font-medium tracking-widest text-black hover:text-surface-500">
          + 새 어르신 추가
        </Dialog.Trigger>
      }
      footer={
        <>
          <ModalClose className="text-base font-medium tracking-widest text-surface-500 hover:text-black">
            취소
          </ModalClose>
          <button
            type="submit"
            form="add-recipient-form"
            disabled={isPending}
            className="px-8 py-3 bg-black text-white text-base font-medium tracking-widest rounded-lg hover:bg-surface-800 disabled:opacity-50"
          >
            {isPending ? '추가 중...' : '추가하기'}
          </button>
        </>
      }
    >
      <form id="add-recipient-form" onSubmit={handleSubmit} className="flex flex-col gap-8">
        <div>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="어르신 성함을 입력하세요"
            className={`px-4 py-3 text-xl ${commonInputClasses}`}
            required
          />
        </div>
        {isError && (
          <p className="text-sm font-medium text-status-danger" role="alert">
            {error instanceof Error
              ? error.message
              : '어르신 등록에 실패했습니다.'}
          </p>
        )}
      </form>
    </Modal>
  );
}
