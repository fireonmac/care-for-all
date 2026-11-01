import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceLoader } from './load-source.mjs';
const { getAuthEnv, getAiUsageEnv } = sourceLoader()('src/env.ts');
test('authentication has no email list dependency; AI quotas parse separately and reject invalid limits', () => {
  const auth = { BETTER_AUTH_URL: 'https://synthetic.example', BETTER_AUTH_SECRET: 'synthetic', GOOGLE_CLIENT_ID: 'synthetic', GOOGLE_CLIENT_SECRET: 'synthetic' };
  assert.equal(getAuthEnv(auth).BETTER_AUTH_URL, auth.BETTER_AUTH_URL);
  assert.deepEqual(getAiUsageEnv({}), { AI_DAILY_USER_LIMIT: 5, AI_DAILY_GLOBAL_LIMIT: 10 });
  for (const limit of ['-1', '1.5', 'bad', '10001']) assert.throws(() => getAiUsageEnv({ AI_DAILY_GLOBAL_LIMIT: limit }));
  assert.equal(getAiUsageEnv({ AI_DAILY_GLOBAL_LIMIT: '0' }).AI_DAILY_GLOBAL_LIMIT, 0);
});
