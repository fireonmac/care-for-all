type AuthUrlEnvironment = {
  BETTER_AUTH_URL?: string;
  VERCEL?: string;
  VERCEL_URL?: string;
};

export function getAuthBaseUrl(config: AuthUrlEnvironment) {
  if (config.BETTER_AUTH_URL) return config.BETTER_AUTH_URL;
  // Vercel supplies this deployment hostname; never infer it from request headers.
  if (config.VERCEL === '1' && /^[a-z0-9-]+\.vercel\.app$/i.test(config.VERCEL_URL ?? '')) {
    return `https://${config.VERCEL_URL}`;
  }
  return undefined;
}
