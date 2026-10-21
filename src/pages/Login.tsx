import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { GoogleSignIn, OrDivider } from '../components/auth/GoogleSignIn';
import { useCaptcha } from '../components/auth/useCaptcha';
import { Input, Label } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthProvider';
import { useToast } from '../context/ToastProvider';
import { AuthFlowError, rememberPendingEmail, safeNext } from '../lib/authFlow';

export function Login() {
  const { user, signInWithPassword } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = safeNext((location.state as { from?: string } | null)?.from);
  const captcha = useCaptcha();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  // The session lands asynchronously (via onAuthStateChange); move on once the profile is in.
  useEffect(() => {
    if (!signedIn || !user) return;
    const firstName = user.full_name?.split(' ')[0];
    showToast(firstName ? `Welcome back, ${firstName}!` : 'Welcome back!');
    navigate(user.onboarded ? from : '/onboarding', { replace: true });
  }, [signedIn, user, from, navigate, showToast]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnconfirmed(false);
    setIsSubmitting(true);
    try {
      await signInWithPassword(email.trim(), password, captcha.token);
      setSignedIn(true);
    } catch (err) {
      setIsSubmitting(false);
      captcha.reset();
      if (err instanceof AuthFlowError && err.code === 'email_not_confirmed') setUnconfirmed(true);
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    }
  }

  function goResend() {
    rememberPendingEmail(email.trim());
    navigate('/check-email', { state: { email: email.trim() } });
  }

  return (
    <AuthLayout
      title="Sign in to SideQuest"
      subtitle="Welcome back. Pick up where you left off."
      footer={
        <>
          New here?{' '}
          <Link to="/signup" state={{ from }} className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <GoogleSignIn next={from} />
      <OrDivider />
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label htmlFor="password" className="text-sm font-medium text-text">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {captcha.widget}
        {error && (
          <div role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-sm text-danger">
            {error}
            {unconfirmed && (
              <button type="button" onClick={goResend} className="mt-1 block font-medium underline">
                Resend the confirmation email
              </button>
            )}
          </div>
        )}
        <Button type="submit" size="lg" isLoading={isSubmitting} disabled={!captcha.ready} className="w-full">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
