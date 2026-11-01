// 외부 오류 설명/코드를 그대로 출력하지 않고 알려진 상태만 사용자 문구로 변환한다.
export function getLoginErrorMessage(error?: string | string[]) {
  if (!error) return null;
  if (error === 'access_denied') return 'Google 로그인이 취소되었습니다. 다시 시도해주세요.';
  if (error === 'state_mismatch' || error === 'state_not_found' || error === 'invalid_code') {
    return '로그인 요청이 만료되었습니다. 다시 시도해주세요.';
  }
  return '로그인을 완료하지 못했습니다. 다시 시도해주세요.';
}
