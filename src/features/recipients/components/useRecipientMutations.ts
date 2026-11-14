'use client';

import { useMutation } from '@tanstack/react-query';
import { addRecipient, deleteRecipient } from '../actions';

export function useRegisterRecipient() {
  return useMutation({ mutationFn: async (payload: Parameters<typeof addRecipient>[0]) => {
    const result = await addRecipient(payload);
    if (result.status === 'invalid') throw new Error(result.error);
    return result;
  } });
}

export function useDeleteRecipient() {
  return useMutation({ mutationFn: deleteRecipient });
}
