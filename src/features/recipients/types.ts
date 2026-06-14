export const RECIPIENTS_PAGE_SIZE = 10;

export type RecipientListItem = {
  id: string;
  name: string;
  latestRecordDate: string | null;
  weeklyRecords: string[];
};

export type RecipientsPage = {
  items: RecipientListItem[];
  nextCursor: string | null;
};
