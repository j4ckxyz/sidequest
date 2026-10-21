import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useToast } from '../context/ToastProvider';
import { safeNext } from '../lib/authFlow';

/** Full-screen "Signing in…" status shown while Google OAuth or an email link completes. */
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
 * Google and the emailed links (sign-up confirmation, password recovery) redirect here.
 * supabase-js exchanges the PKCE code for a session (see supabase.ts detectSessionInUrl/pkce);
 * we wait for that, greet the user, and forward them on. `type` is set by us on the email
 * links' redirect URLs; Google returns without one.
 */
export function AuthCallback() {
  const { user, isLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const type = params.get('type'); // 'signup' | 'recovery' | null (Google)
  // Expired/used email links come back with the error in the URL fragment, OAuth errors in the query.
  const [hash] = useState(() => new URLSearchParams(window.location.hash.slice(1)));
  const linkError = params.get('error_description') || params.get('error') || hash.get('error_description') || hash.get('error');
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    if (linkError) {
      done.current = true;
      if (type === 'recovery') {
        showToast('That reset link has expired or was already used. Request a new one.', 'error');
        navigate('/forgot-password', { replace: true });
      } else if (type === 'signup') {
        showToast('That confirmation link has expired or was already used. Try signing in, or resend it.', 'error');
        navigate('/login', { replace: true });
      } else {
        showToast('Google sign-in didn’t complete. Please try again.', 'error');
        navigate('/login', { replace: true });
      }
      return;
    }
    if (user) {
      done.current = true;
      if (type === 'recovery') {
        navigate('/reset-password', { replace: true });
        return;
      }
      const firstName = user.full_name?.split(' ')[0];
      if (type === 'signup') showToast('Email confirmed — welcome to SideQuest!');
      else showToast(firstName ? `Welcome back, ${firstName}!` : 'Welcome back!');
      navigate(user.onboarded ? next : '/onboarding', { replace: true });
      return;
    }
    // Email link opened somewhere the code can't be exchanged (another browser/device: the PKCE
    // verifier lives where the request started). A confirmation is still applied server-side.
    if (!isLoading && type) {
      done.current = true;
      if (type === 'recovery') {
        showToast('Open the reset link in the browser you requested it from, or request a new one.', 'error');
        navigate('/forgot-password', { replace: true });
      } else {
        showToast('Email confirmed — sign in to continue.');
        navigate('/login', { replace: true });
      }
    }
  }, [user, isLoading, type, linkError, next, navigate, showToast]);

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

  return <SigningIn message={type ? 'Checking your link…' : undefined} />;
}
