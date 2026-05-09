export function appBaseUrl(): string {
  return (process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '');
}

export function apiBaseUrl(): string {
  const explicitApiBase = process.env.API_BASE_URL;
  if (explicitApiBase && explicitApiBase.trim().length > 0) {
    return explicitApiBase.replace(/\/$/, '');
  }

  return `${appBaseUrl()}/api/v1`;
}
