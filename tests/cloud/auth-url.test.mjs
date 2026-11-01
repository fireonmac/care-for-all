import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceLoader } from './load-source.mjs';
const { getAuthBaseUrl } = sourceLoader()('src/lib/auth-url.ts');

test('explicit auth URL preserves local and custom-domain configuration', () => {
  assert.equal(getAuthBaseUrl({ BETTER_AUTH_URL: 'http://localhost:3000' }), 'http://localhost:3000');
  assert.equal(getAuthBaseUrl({ BETTER_AUTH_URL: 'https://care.example', VERCEL: '1', VERCEL_URL: 'preview.vercel.app' }), 'https://care.example');
});

test('Vercel Preview resolves its own HTTPS deployment origin without a placeholder', () => {
  assert.equal(getAuthBaseUrl({ VERCEL: '1', VERCEL_URL: 'care-for-all-preview.vercel.app' }), 'https://care-for-all-preview.vercel.app');
});

test('auth URL fallback rejects local, malformed, and unrelated hosts', () => {
  assert.equal(getAuthBaseUrl({ VERCEL_URL: 'preview.vercel.app' }), undefined);
  for (const host of ['evil.example', 'care.vercel.app.evil.example', 'https://care.vercel.app', 'care.vercel.app/path', 'care.vercel.app@evil.example', '']) {
    assert.equal(getAuthBaseUrl({ VERCEL: '1', VERCEL_URL: host }), undefined);
  }
});
