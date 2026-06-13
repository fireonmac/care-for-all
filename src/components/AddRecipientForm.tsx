'use client';

import { useState } from 'react';
import { Modal, ModalClose } from './Modal';
import { Dialog } from '@base-ui/react';
import { addRecipient } from '@/app/actions';
import { commonInputClasses } from './Textarea';

export function AddRecipientForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    await addRecipient(name);
    setLoading(false);
    setOpen(false);
    setName('');
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
            onClick={handleSubmit}
            disabled={loading}
            className="px-8 py-3 bg-black text-white text-base font-medium tracking-widest rounded-lg hover:bg-surface-800 disabled:opacity-50"
          >
            {loading ? '추가 중...' : '추가하기'}
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
      </form>
    </Modal>
  );
}
