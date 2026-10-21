import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { PasswordFields } from '../components/auth/PasswordFields';
import { Button } from '../components/ui/Button';
import { PageSpinner } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthProvider';
import { useToast } from '../context/ToastProvider';
import { MIN_PASSWORD_LENGTH } from '../lib/authFlow';

/** Reached via /auth/callback?type=recovery, which has already exchanged the link for a session. */
export function ResetPassword() {
  const { user, isLoading, updatePassword } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) return <PageSpinner />;

  if (!user) {
    return (
      <AuthLayout title="This reset link has expired" subtitle="Links work once, for a limited time, in the browser you requested them from.">
        <Link
          to="/forgot-password"
          className="flex h-12 w-full items-center justify-center rounded-lg bg-primary text-base font-medium text-on-primary hover:bg-primary-hover"
        >
          Send a new link
        </Link>
      </AuthLayout>
    );
  }

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
      await updatePassword(password);
      showToast('Password updated — you’re signed in.');
      navigate('/', { replace: true });
    } catch (err) {
      setIsSubmitting(false);
      setError(err instanceof Error ? err.message : 'Could not update your password.');
    }
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="You’ll use this with your email next time you sign in.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
        {error && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
