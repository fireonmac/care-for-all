import { createInsertSchema } from 'drizzle-zod';
import { recipients } from '@/db/schema';
import { z } from 'zod';

export const insertRecipientSchema = createInsertSchema(recipients).pick({
  name: true,
}).extend({
  name: z.string().min(1, '성함을 입력해주세요.'),
});

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
