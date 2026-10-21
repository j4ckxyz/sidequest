import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { useCaptcha } from '../components/auth/useCaptcha';
import { Input, Label } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthProvider';

export function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const captcha = useCaptcha();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email.trim(), captcha.token);
      setSent(true);
    } catch (err) {
      captcha.reset();
      setError(err instanceof Error ? err.message : 'Could not send the reset email.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const backToLogin = (
    <Link to="/login" className="font-medium text-primary hover:underline">
      Back to sign in
    </Link>
  );

  if (sent) {
    return (
      <AuthLayout title="Check your inbox" subtitle="If there’s an account for that email, a reset link is on its way." footer={backToLogin}>
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
            <MailCheck size={26} />
          </span>
          <p className="mt-4 text-sm text-text-muted">Open the link in this browser to choose a new password. Signed up with Google? Just use the Google button instead.</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We’ll email you a link to choose a new one." footer={backToLogin}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {captcha.widget}
        {error && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" isLoading={isSubmitting} disabled={!captcha.ready} className="w-full">
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  );
}
