export const recipientQueryKeys = {
  all: ['recipients'] as const,
  list: (searchQuery: string) =>
    [...recipientQueryKeys.all, 'list', { searchQuery }] as const,
};
