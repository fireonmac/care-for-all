-- Apply once to the existing pre-workspace schema, after an approved backup.
-- Fresh databases use the current Drizzle schema instead.
BEGIN IMMEDIATE;
CREATE TABLE workspaces (id TEXT PRIMARY KEY NOT NULL, provisioned_for_user_id TEXT NOT NULL UNIQUE REFERENCES user(id), created_at INTEGER NOT NULL);
CREATE TABLE workspace_members (workspace_id TEXT NOT NULL REFERENCES workspaces(id), user_id TEXT NOT NULL REFERENCES user(id), PRIMARY KEY (workspace_id, user_id));
ALTER TABLE recipients ADD COLUMN workspace_id TEXT REFERENCES workspaces(id);
ALTER TABLE recipients ADD COLUMN created_by_user_id TEXT REFERENCES user(id);
ALTER TABLE records ADD COLUMN created_by_user_id TEXT REFERENCES user(id);
CREATE TABLE recipient_shares (recipient_id TEXT NOT NULL REFERENCES recipients(id), user_id TEXT NOT NULL REFERENCES user(id), permission TEXT NOT NULL, PRIMARY KEY (recipient_id,user_id), CONSTRAINT recipient_shares_permission CHECK (permission IN ('read','edit')));
CREATE TABLE ai_usage (bucket TEXT NOT NULL, day TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY (bucket,day));
COMMIT;
