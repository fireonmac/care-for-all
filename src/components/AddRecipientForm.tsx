'use client';

import { useState } from 'react';
import { Dialog } from '@base-ui/react';
import { addRecipient } from '@/app/actions';

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
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="text-base font-medium tracking-widest text-black hover:text-surface-500">
        + 새 어르신 추가
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-white/80 backdrop-blur-sm z-40" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-10 w-[90vw] max-w-md shadow-2xl z-50 outline-none border border-surface-200 rounded-2xl">
          <Dialog.Title className="text-2xl font-medium text-black mb-8 tracking-tight">
            어르신 등록
          </Dialog.Title>
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full bg-surface-50 border border-surface-200 p-4 rounded-xl focus:ring-1 focus:border-primary-500 text-black text-xl font-light placeholder:text-surface-300 shadow-inner"
                required
              />
            </div>
            <div className="flex justify-end gap-6 pt-4">
              <Dialog.Close className="text-base font-medium tracking-widest text-surface-500 hover:text-black">
                취소
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-black text-white text-base font-medium tracking-widest rounded-xl hover:bg-surface-800 disabled:opacity-50"
              >
                {loading ? '추가 중...' : '추가하기'}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
