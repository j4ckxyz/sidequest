import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { GoogleSignIn, OrDivider } from '../components/auth/GoogleSignIn';
import { PasswordFields } from '../components/auth/PasswordFields';
import { useCaptcha } from '../components/auth/useCaptcha';
import { Input, Label } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthProvider';
import { MIN_PASSWORD_LENGTH, rememberPendingEmail, safeNext } from '../lib/authFlow';

export function Signup() {
  const { signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = safeNext((location.state as { from?: string } | null)?.from);
  const captcha = useCaptcha();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`);
      return;
    }
    if (password !== confirm) {
      setConfirmError('Passwords don’t match.');
      return;
    }
    setIsSubmitting(true);
    try {
      const address = email.trim();
      await signUpWithEmail(address, password, captcha.token);
      rememberPendingEmail(address);
      navigate('/check-email', { replace: true, state: { email: address, justSent: true } });
    } catch (err) {
      setIsSubmitting(false);
      captcha.reset();
      setError(err instanceof Error ? err.message : 'Could not create your account.');
    }
  }

  return (
    <AuthLayout
      title="Join SideQuest"
      subtitle="Find and post short local jobs across Jersey."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={{ from }} className="font-medium text-primary hover:underline">
            Sign in
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
        <PasswordFields
          password={password}
          confirm={confirm}
          onPassword={setPassword}
          onConfirm={(value) => {
            setConfirm(value);
            setConfirmError(undefined);
          }}
          confirmError={confirmError}
        />
        {captcha.widget}
        {error && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" isLoading={isSubmitting} disabled={!captcha.ready} className="w-full">
          Create account
        </Button>
        <p className="text-center text-xs text-text-muted">By continuing you agree to keep SideQuest neighbourly.</p>
      </form>
    </AuthLayout>
  );
}
