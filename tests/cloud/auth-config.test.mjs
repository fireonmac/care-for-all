import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceLoader } from './load-source.mjs';
const { getAuthEnv } = sourceLoader()('src/env.ts');
test('authentication has no email list dependency', () => {
  const auth = { BETTER_AUTH_URL: 'https://synthetic.example', BETTER_AUTH_SECRET: 'synthetic', GOOGLE_CLIENT_ID: 'synthetic', GOOGLE_CLIENT_SECRET: 'synthetic' };
  assert.equal(getAuthEnv(auth).BETTER_AUTH_URL, auth.BETTER_AUTH_URL);
});
