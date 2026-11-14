'use client';

import { useMutation } from '@tanstack/react-query';
import { addRecipient, deleteRecipient, renameRecipient } from '../actions';

export function useSaveRecipientName(recipientId?: string) {
  return useMutation({ mutationFn: async (payload: Parameters<typeof addRecipient>[0]) => {
    const result = recipientId ? await renameRecipient(recipientId, payload) : await addRecipient(payload);
    if (result.status === 'invalid') throw new Error(result.error);
    return result;
  } });
}

export function useDeleteRecipient() {
  return useMutation({ mutationFn: deleteRecipient });
}
