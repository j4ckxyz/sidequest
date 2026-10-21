/** An auth failure with a message that's safe and friendly to show as-is. */
export class AuthFlowError extends Error {
  readonly code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AuthFlowError';
    this.code = code;
  }
}

/**
 * Only same-origin, path-relative redirect targets: must start with a single "/".
 * Rejects "//evil.com", "/\evil.com" and full URLs so ?next= can't bounce people off-site.
 */
export function safeNext(raw: string | null | undefined, fallback = '/'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  return raw;
}

export const MIN_PASSWORD_LENGTH = 8;

/** Rough strength hint for the sign-up / reset forms — guidance only, not a gate. */
export function passwordStrength(password: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (password.length < MIN_PASSWORD_LENGTH) return { score: 0, label: `At least ${MIN_PASSWORD_LENGTH} characters` };
  let variety = 0;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) variety++;
  if (/\d/.test(password)) variety++;
  if (/[^A-Za-z0-9]/.test(password)) variety++;
  const points = variety + (password.length >= 12 ? 1 : 0) + (password.length >= 16 ? 1 : 0);
  if (points >= 3) return { score: 3, label: 'Strong' };
  if (points >= 2) return { score: 2, label: 'Good' };
  return { score: 1, label: 'Weak — add length, numbers or symbols' };
}

// The address we just sent a confirmation to, so the "check your inbox" screen survives a refresh.
const PENDING_EMAIL_KEY = 'sidequest-pending-email';

export function rememberPendingEmail(email: string) {
  try {
    sessionStorage.setItem(PENDING_EMAIL_KEY, email);
  } catch {
    // ignore — the screen just won't survive a refresh
  }
}

export function readPendingEmail(): string | null {
  try {
    return sessionStorage.getItem(PENDING_EMAIL_KEY);
  } catch {
    return null;
  }
}
