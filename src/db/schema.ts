import { relations, sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index, primaryKey, check } from 'drizzle-orm/sqlite-core';

export const recipients = sqliteTable('recipients', {
  id: text('id').primaryKey(), // uuid 등
  name: text('name').notNull(),
  workspaceId: text('workspace_id').references(() => workspaces.id),
  createdByUserId: text('created_by_user_id').references(() => user.id),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const records = sqliteTable('records', {
  id: text('id').primaryKey(),
  recipientId: text('recipient_id')
    .notNull()
    .references(() => recipients.id),
  createdByUserId: text('created_by_user_id').references(() => user.id),
  date: text('date').notNull(), // 'YYYY-MM-DD' 형식
  type: text('type', { enum: ['daily', 'weekly'] }).notNull(),
  cognitionContent: text('cognition_content'),
  behaviorContent: text('behavior_content'),
  combinedContent: text('combined_content'), // 주간 리포트 등에서 사용
  status: text('status', { enum: ['PROCESSING', 'COMPLETED', 'FAILED'] }).default('COMPLETED').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// 같은 공간 모델을 1인 및 기관 공동 사용에 적용한다. 구성원 추가만으로 자료가 공개되지 않는다.
export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  provisionedForUserId: text('provisioned_for_user_id').notNull().unique().references(() => user.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const workspaceMembers = sqliteTable('workspace_members', {
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id),
  userId: text('user_id').notNull().references(() => user.id),
}, (table) => [primaryKey({ columns: [table.workspaceId, table.userId] })]);

export const recipientShares = sqliteTable('recipient_shares', {
  recipientId: text('recipient_id').notNull().references(() => recipients.id),
  userId: text('user_id').notNull().references(() => user.id),
  permission: text('permission', { enum: ['read', 'edit'] }).notNull(),
}, (table) => [primaryKey({ columns: [table.recipientId, table.userId] }),
  check('recipient_shares_permission', sql`${table.permission} in ('read', 'edit')`),
]);
