import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useToast } from '../context/ToastProvider';

/** Full-screen "Signing in…" status shown while Google OAuth completes. */
export function SigningIn({ message = 'Signing in with Google…' }: { message?: string }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <Loader2 size={30} className="animate-spin text-primary" />
      <div>
        <p className="text-lg text-text">{message}</p>
        <p className="mt-1 text-sm text-text-muted">Just a moment while we set things up.</p>
      </div>
    </div>
  );
}

/**
 * Google redirects here after auth. supabase-js exchanges the code for a session
 * (see supabase.ts detectSessionInUrl/pkce); we wait for that, greet the user,
 * and forward them on — instead of dropping to a blank home page on iOS.
 */
export function AuthCallback() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const oauthError = params.get('error_description') || params.get('error');
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    if (oauthError) {
      done.current = true;
      showToast('Google sign-in didn’t complete. Please try again.', 'error');
      navigate('/login', { replace: true });
      return;
    }
    if (user) {
      done.current = true;
      const firstName = user.full_name?.split(' ')[0];
      showToast(firstName ? `Welcome back, ${firstName}!` : 'Welcome back!');
      navigate(user.onboarded ? next : '/onboarding', { replace: true });
    }
  }, [user, oauthError, next, navigate, showToast]);

  // Safety net: if the session never resolves, don't hang on the spinner forever.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!done.current && !user) {
        done.current = true;
        showToast('Could not complete sign-in. Please try again.', 'error');
        navigate('/login', { replace: true });
      }
    }, 12000);
    return () => clearTimeout(timer);
  }, [user, navigate, showToast]);

  return <SigningIn />;
}
