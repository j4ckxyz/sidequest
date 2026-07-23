import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { useAuth } from '../context/AuthProvider';
import { useToast } from '../context/ToastProvider';
import { isLiveBackend } from '../lib/supabase';
import { SigningIn } from './AuthCallback';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

export function Login() {
  const { signInWithGoogle } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  async function onGoogle() {
    setIsSubmitting(true);
    try {
      if (isLiveBackend) {
        // Show the status screen immediately so the app doesn't flash the home
        // page before the browser leaves for Google. This page then unloads.
        setRedirecting(true);
        await signInWithGoogle(from);
        return; // /auth/callback handles the return + "Welcome back" toast
      }
      // Dev mock: resolves in place — greet and navigate ourselves.
      await signInWithGoogle(from);
      showToast('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      setRedirecting(false);
      showToast(err instanceof Error ? err.message : 'Could not sign in.', 'error');
      setIsSubmitting(false);
    }
  }

  if (redirecting) return <SigningIn />;

  return (
    <AuthLayout
      title="Sign in to SideQuest"
      subtitle="One tap with Google — no passwords, no faff."
      footer={<>By continuing you agree to keep SideQuest neighbourly.</>}
    >
      <button
        type="button"
        onClick={onGoogle}
        disabled={isSubmitting}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-border bg-surface text-base font-medium text-text transition hover:bg-surface-2 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        <GoogleIcon />
        {isSubmitting ? 'Signing in…' : 'Continue with Google'}
      </button>
      <p className="mt-4 text-center text-xs text-text-muted">New here? Signing in with Google creates your account too.</p>
    </AuthLayout>
  );
}
