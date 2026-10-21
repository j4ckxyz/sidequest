import { useCallback, useState } from 'react';
import { TurnstileWidget } from './Turnstile';

/** Unset in local dev: forms render without the widget and send no captcha token. */
export const captchaEnabled = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);

/**
 * Cloudflare Turnstile for the auth forms. `token` goes to Supabase as options.captchaToken;
 * `ready` is false until the widget has produced one (always true when captcha is disabled).
 * Call `reset()` after every auth attempt, since Supabase consumes the token.
 */
export function useCaptcha() {
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const reset = useCallback(() => {
    if (!captchaEnabled) return;
    setToken(null);
    setResetKey((n) => n + 1);
  }, []);
  return {
    token: token ?? undefined,
    ready: !captchaEnabled || token !== null,
    reset,
    widget: captchaEnabled ? <TurnstileWidget onToken={setToken} resetKey={resetKey} /> : null,
  };
}
