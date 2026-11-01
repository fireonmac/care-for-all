import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceLoader } from './load-source.mjs';

function environment(t, extra = {}) {
  const previous = process.env;
  process.env = {
    DATABASE_URL: 'libsql://synthetic.turso.io', TURSO_AUTH_TOKEN: 'synthetic-token',
    VERCEL: '1', VERCEL_URL: 'synthetic-preview.vercel.app',
    BETTER_AUTH_SECRET: 'synthetic-session-secret-not-for-production',
    GOOGLE_CLIENT_ID: 'synthetic-client', GOOGLE_CLIENT_SECRET: 'synthetic-secret',
    ...extra,
  };
  t.after(() => { process.env = previous; });
}

test('real auth env and recipient API work without AI settings, while access checks remain', async (t) => {
  environment(t);
  let session = null;
  let databaseCalls = 0;
  const load = sourceLoader({
    'better-auth': { betterAuth: () => ({ api: { getSession: async () => session } }) },
    '@better-auth/drizzle-adapter': { drizzleAdapter: () => ({}) },
    '@/db': { db: {} },
    'next/headers': { headers: async () => new Headers() },
    'next/navigation': { redirect: () => { throw new Error('redirect-login'); } },
    '@/features/recipients/queries': { getRecipientsPage: async () => { databaseCalls++; return { items: [], nextCursor: null }; } },
  });
  const api = load('src/app/api/recipients/route.ts');
  const request = () => new Request('https://synthetic-preview.vercel.app/api/recipients');
  assert.equal((await api.GET(request())).status, 401);
  session = { user: { email: 'outsider@example.com', emailVerified: false } };
  assert.equal((await api.GET(request())).status, 403);
  assert.equal(databaseCalls, 0);
  session.user = { email: 'caregiver@example.com', emailVerified: true };
  const response = await api.GET(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { items: [], nextCursor: null });
  assert.equal(databaseCalls, 1);
});

test('all generation entry points reject missing model before any network call', async (t) => {
  environment(t, { AI_PROVIDER: 'openai-compatible', AI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/openai', AI_API_KEY: 'synthetic-key' });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('network must not be used'); });
  const ai = sourceLoader()('src/lib/ai.ts');
  for (const run of [() => ai.generateDailyRecord('합성 메모'), () => ai.streamDailyRecord('합성 메모'), () => ai.generateWeeklyRecord([])]) {
    await assert.rejects(run(), { name: 'AiConfigurationError', message: /AI_MODEL/ });
  }
  assert.equal(calls, 0);
});

test('missing provider and blank model never choose implicit defaults', (t) => {
  environment(t, { AI_MODEL: 'synthetic-model' });
  const { getAiConfig } = sourceLoader()('src/lib/ai/config.ts');
  assert.throws(getAiConfig, /AI_PROVIDER/);
  process.env.AI_PROVIDER = 'ollama'; process.env.AI_MODEL = '  ';
  assert.throws(getAiConfig, /AI_MODEL/);
});

test('daily API rejects anonymous callers first, then reports AI configuration as 503', async (t) => {
  environment(t, { AI_PROVIDER: 'openai-compatible' });
  let session = null;
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('network must not be used'); });
  const route = sourceLoader({ '@/lib/auth': { getSession: async () => session }, '@/lib/workspace-access': { requireRecipient: async () => ({}), AccessDeniedError: class extends Error {} }, '@/lib/ai/input': { validateAiInput: () => {}, DAILY_INPUT_LIMIT: 4000 } })('src/app/api/generate-daily/route.ts');
  const request = () => new Request('https://synthetic-preview.vercel.app/api/generate-daily', { method: 'POST', body: JSON.stringify({ keywords: '합성 메모', recipientId: 'synthetic' }) });
  assert.equal((await route.POST(request())).status, 401);
  session = { user: { id: 'synthetic', emailVerified: true } };
  const response = await route.POST(request());
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /AI 설정/);
  assert.equal(calls, 0);
});

test('explicit provider/model settings retain both existing provider configuration shapes', (t) => {
  environment(t, { AI_PROVIDER: 'ollama', AI_MODEL: 'installed-local-model' });
  const { getAiConfig } = sourceLoader()('src/lib/ai/config.ts');
  assert.deepEqual(getAiConfig(), { provider: 'ollama', model: 'installed-local-model', baseUrl: 'http://127.0.0.1:11434', apiKey: undefined });
  process.env.AI_PROVIDER = 'openai-compatible'; process.env.AI_MODEL = 'explicit-model';
  process.env.AI_BASE_URL = 'https://synthetic.example/v1'; process.env.AI_API_KEY = 'synthetic-key';
  assert.deepEqual(getAiConfig(), { provider: 'openai-compatible', model: 'explicit-model', baseUrl: 'https://synthetic.example/v1', apiKey: 'synthetic-key' });
});


test('lazy environment groups validate independently without auth, DB or AI cross-dependencies', () => {
  const env = sourceLoader()('src/env.ts');
  assert.equal(env.getDatabaseConfig({ DATABASE_URL: ':memory:' }).url, ':memory:');
  assert.equal(env.getAiEnv({ AI_PROVIDER: 'ollama', AI_MODEL: 'synthetic-model' }).AI_MODEL, 'synthetic-model');
  assert.throws(() => env.getAiEnv({ AI_PROVIDER: 'openai-compatible', AI_MODEL: 'model', AI_BASE_URL: 'file:///invalid' }), /AI_BASE_URL/);
  assert.throws(() => env.getAuthEnv({}), /인증 환경변수/);
  assert.equal(env.getAuthEnv({ VERCEL: '1', BETTER_AUTH_URL: 'https://synthetic.example', BETTER_AUTH_SECRET: 'synthetic', GOOGLE_CLIENT_ID: 'synthetic', GOOGLE_CLIENT_SECRET: 'synthetic' }).BETTER_AUTH_URL, 'https://synthetic.example');
});
