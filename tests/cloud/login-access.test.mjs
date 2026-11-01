import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceLoader } from './load-source.mjs';

test('login errors map cancellation and expired flows without reflecting arbitrary provider text', () => {
  const { getLoginErrorMessage } = sourceLoader()('src/app/login/errors.ts');
  assert.equal(getLoginErrorMessage(), null);
  assert.match(getLoginErrorMessage('access_denied'), /취소/);
  assert.match(getLoginErrorMessage('state_mismatch'), /만료/);
  for (const error of ['UNKNOWN', '<script>secret</script>', ['invalid_code', 'unknown']]) {
    assert.equal(getLoginErrorMessage(error), '로그인을 완료하지 못했습니다. 다시 시도해주세요.');
  }
});
