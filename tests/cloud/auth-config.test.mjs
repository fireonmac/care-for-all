import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceLoader } from './load-source.mjs';

const { getAuthEnv } = sourceLoader()('src/env.ts');
const auth = {
  BETTER_AUTH_URL: 'https://synthetic.example',
  BETTER_AUTH_SECRET: 'synthetic-not-a-real-secret',
  GOOGLE_CLIENT_ID: 'synthetic-client', GOOGLE_CLIENT_SECRET: 'synthetic-secret',
};

test('allowlist is required by default on every host, independently of NODE_ENV and VERCEL', () => {
  for (const host of [{}, { NODE_ENV: 'development' }, { NODE_ENV: 'production' }, { VERCEL: '1' }]) {
    assert.throws(() => getAuthEnv({ ...auth, ...host }), /ALLOWED_EMAILS/);
    const config = getAuthEnv({ ...auth, ...host, ALLOWED_EMAILS: 'caregiver@example.com' });
    assert.equal(config.requireAllowlist, true);
    assert.equal(Object.hasOwn(config, 'VERCEL'), false);
  }
});

test('private local/Docker operation can explicitly opt into authenticated-only access', () => {
  for (const value of ['false', '0']) {
    assert.equal(getAuthEnv({ ...auth, NODE_ENV: 'production', AUTH_REQUIRE_ALLOWLIST: value }).requireAllowlist, false);
  }
  assert.throws(() => getAuthEnv({ ...auth, AUTH_REQUIRE_ALLOWLIST: 'misspelled' }), /AUTH_REQUIRE_ALLOWLIST/);
  assert.throws(() => getAuthEnv({ ...auth, AUTH_REQUIRE_ALLOWLIST: 'true' }), /ALLOWED_EMAILS/);
});

test('validation skip keeps the access policy and does not silently disable it', () => {
  assert.equal(getAuthEnv({ SKIP_ENV_VALIDATION: '1' }).requireAllowlist, true);
  assert.equal(getAuthEnv({ npm_lifecycle_event: 'build' }).requireAllowlist, true);
  assert.throws(() => getAuthEnv({ SKIP_ENV_VALIDATION: '1', AUTH_REQUIRE_ALLOWLIST: 'typo' }), /AUTH_REQUIRE_ALLOWLIST/);
});
