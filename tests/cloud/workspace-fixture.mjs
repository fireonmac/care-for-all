import { createClient } from '@libsql/client';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { wrapTestClient } from './libsql-fixture.mjs';
import { sourceLoader } from './load-source.mjs';

export async function workspaceFixture(t, options = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'care-workspace-test-'));
  const url = `file:${join(directory, 'synthetic.db')}`;
  const client = createClient({ url });
  t.after(() => { client.close(); rmSync(directory, { recursive: true, force: true }); });
  await client.executeMultiple(`PRAGMA foreign_keys=ON;
    CREATE TABLE user (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, email_verified INTEGER NOT NULL, image TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
    CREATE TABLE recipients (id TEXT PRIMARY KEY, name TEXT NOT NULL, is_active INTEGER DEFAULT 1, created_at INTEGER NOT NULL);
    CREATE TABLE records (id TEXT PRIMARY KEY, recipient_id TEXT NOT NULL REFERENCES recipients(id), date TEXT NOT NULL, type TEXT NOT NULL, cognition_content TEXT, behavior_content TEXT, combined_content TEXT, status TEXT NOT NULL DEFAULT 'COMPLETED', created_at INTEGER NOT NULL);
    INSERT INTO recipients VALUES ('legacy','Synthetic legacy',1,1);
    INSERT INTO records (id,recipient_id,date,type,cognition_content,created_at) VALUES ('legacy-record','legacy','2026-01-01','daily','Synthetic legacy content',1);`);
  await client.executeMultiple(readFileSync(new URL('../../migrations/0001_workspace_access.sql', import.meta.url), 'utf8'));
  const { db } = wrapTestClient(client);
  const schema = sourceLoader()('src/db/schema.ts');
  const users = Object.fromEntries(['alice', 'bob', 'charlie', 'unverified'].map(id => [id, { id, name: id, email: `${id}@example.com`, emailVerified: id !== 'unverified', createdAt: new Date(), updatedAt: new Date() }]));
  await db.insert(schema.user).values(Object.values(users));
  let current = users.alice;
  let aiCalls = 0;
  const callbacks = [];
  const load = sourceLoader({
    '@/db': { db },
    '@/lib/auth': {
      requireSession: async () => { if (!current) throw new Error('login-required'); return { user: current }; },
      getSession: async () => current ? { user: current } : null,
    },
    'next/navigation': { notFound: () => { throw new Error('not-found'); } },
    'next/cache': { revalidatePath() {} },
    'next/server': { after: callback => callbacks.push(callback) },
    '@/lib/ai': {
      generateDailyRecord: async () => { aiCalls++; return '[인지] 합성 인지 [행동] 합성 행동'; },
      streamDailyRecord: async () => { aiCalls++; return new Response('[인지] 합성 인지 [행동] 합성 행동').body; },
      generateWeeklyRecord: async (input) => { aiCalls++; if (options.generateWeekly) return options.generateWeekly(input); return '합성 주간 결과'; },
    },
  });
  const actions = load('src/app/(main)/recipients/[id]/actions.ts');
  const add = load('src/features/recipients/actions.ts').addRecipient;
  const listing = load('src/features/recipients/queries.ts').getRecipientsPage;
  const share = load('src/features/recipients/sharing.ts');
  const access = load('src/lib/workspace-access.ts');
  async function createRecipient(name) {
    await add({ name, createdByUserId: 'spoofed', workspaceId: 'spoofed' });
    const { items } = await listing(name);
    return items[0].id;
  }
  return { url, client, db, schema, load, actions, share, access, users, callbacks, listing, createRecipient,
    login: id => { current = id ? users[id] : null; }, aiCalls: () => aiCalls };
}
