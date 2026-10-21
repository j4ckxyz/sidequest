import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { db } from '../lib/db';
import type { Profile } from '../types/models';

interface AuthContextValue {
  user: Profile | null;
  isLoading: boolean;
  /** Redirects to Google, then back to /auth/callback with a session (production).
   *  On the dev mock backend this signs straight into the demo account. */
  signInWithGoogle: (next?: string) => Promise<void>;
  /** Email + password. Each takes the Turnstile token (undefined when captcha is off). */
  signUpWithEmail: (email: string, password: string, captchaToken?: string) => Promise<void>;
  signInWithPassword: (email: string, password: string, captchaToken?: string) => Promise<void>;
  resendConfirmation: (email: string, captchaToken?: string) => Promise<void>;
  requestPasswordReset: (email: string, captchaToken?: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Cache the resolved profile so a page refresh shows the logged-in UI instantly
// instead of blocking on a getSession + profile round-trip behind a spinner.
// The session is still revalidated in the background and this is corrected.
const CACHE_KEY = 'sidequest-user';

function readCachedUser(): Profile | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(profile: Profile | null) {
  try {
    if (profile) localStorage.setItem(CACHE_KEY, JSON.stringify(profile));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore (private mode / storage full) — cache is a best-effort optimisation
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const cached = readCachedUser();
  const [user, setUser] = useState<Profile | null>(cached);
  // If we already have a cached identity, don't gate the app on the network —
  // render optimistically and revalidate. Only truly-unknown state shows loading.
  const [isLoading, setIsLoading] = useState(cached === null);

  useEffect(() => {
    let active = true;
    const apply = (profile: Profile | null) => {
      if (!active) return;
      setUser(profile);
      setIsLoading(false);
      writeCachedUser(profile);
    };
    db.auth.getSession().then(apply);
    const unsubscribe = db.subscribe(() => {
      db.auth.getSession().then((profile) => active && apply(profile));
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    signInWithGoogle: (next?: string) => db.auth.signInWithGoogle(next),
    signUpWithEmail: (email, password, captchaToken) => db.auth.signUpWithEmail(email, password, captchaToken),
    signInWithPassword: (email, password, captchaToken) => db.auth.signInWithPassword(email, password, captchaToken),
    resendConfirmation: (email, captchaToken) => db.auth.resendConfirmation(email, captchaToken),
    requestPasswordReset: (email, captchaToken) => db.auth.requestPasswordReset(email, captchaToken),
    updatePassword: (password) => db.auth.updatePassword(password),
    signOut: () => db.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
