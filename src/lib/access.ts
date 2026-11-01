export function isAllowedUser(
  user: { email: string; emailVerified: boolean },
  allowedEmails?: string,
  requireAllowlist = false,
) {
  const emails = (allowedEmails ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
  // 기존 로컬/Docker 설정을 유지한다. 공개 배포에서는 allowlist를 필수로 설정한다.
  return emails.length === 0 ? !requireAllowlist : user.emailVerified && emails.includes(user.email.trim().toLowerCase());
}
