import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const recipients = sqliteTable('recipients', {
  id: text('id').primaryKey(), // uuid 등
  name: text('name').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const records = sqliteTable('records', {
  id: text('id').primaryKey(),
  recipientId: text('recipient_id')
    .notNull()
    .references(() => recipients.id),
  date: text('date').notNull(), // 'YYYY-MM-DD' 형식
  type: text('type', { enum: ['daily', 'weekly'] }).notNull(),
  cognitionContent: text('cognition_content'),
  behaviorContent: text('behavior_content'),
  combinedContent: text('combined_content'), // 주간 리포트 등에서 사용
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
