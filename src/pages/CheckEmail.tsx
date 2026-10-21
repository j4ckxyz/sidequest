import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { useCaptcha } from '../components/auth/useCaptcha';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthProvider';
import { useToast } from '../context/ToastProvider';
import { readPendingEmail } from '../lib/authFlow';

const RESEND_COOLDOWN_S = 60;
const LAST_SENT_KEY = 'sidequest-confirm-sent-at';

function secondsLeft(): number {
  try {
    const sentAt = Number(sessionStorage.getItem(LAST_SENT_KEY) ?? 0);
    return Math.max(0, Math.ceil((sentAt + RESEND_COOLDOWN_S * 1000 - Date.now()) / 1000));
  } catch {
    return 0;
  }
}

function markSent() {
  try {
    sessionStorage.setItem(LAST_SENT_KEY, String(Date.now()));
  } catch {
    // ignore — the cooldown just won't survive a refresh
  }
}

/** "Check your inbox" after email sign-up, with a rate-limited resend. */
export function CheckEmail() {
  const { resendConfirmation } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const state = location.state as { email?: string; justSent?: boolean } | null;
  const email = state?.email ?? readPendingEmail();
  const captcha = useCaptcha();
  const [cooldown, setCooldown] = useState(() => {
    // Arriving straight from sign-up means an email just went out; start the clock.
    if (state?.justSent && secondsLeft() === 0) markSent();
    return secondsLeft();
  });
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(secondsLeft()), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!email) return <Navigate to="/signup" replace />;

  async function resend() {
    if (!email || cooldown > 0) return;
    setIsSending(true);
    try {
      await resendConfirmation(email, captcha.token);
      markSent();
      setCooldown(secondsLeft());
      showToast('Sent — check your inbox.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not resend the email.', 'error');
    } finally {
      setIsSending(false);
      captcha.reset();
    }
  }

  return (
    <AuthLayout
      title="Check your inbox to confirm your email"
      subtitle="One more step and you’re in."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
          <MailCheck size={26} />
        </span>
        <p className="mt-4 text-sm text-text">
          We’ve sent a confirmation link to <span className="font-medium break-all">{email}</span>.
        </p>
        <p className="mt-1.5 text-sm text-text-muted">Open it on this device to finish signing up. It can take a minute, and check your spam folder too.</p>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {captcha.widget}
        <Button variant="secondary" size="lg" className="w-full" onClick={resend} isLoading={isSending} disabled={cooldown > 0 || !captcha.ready}>
          {cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend email'}
        </Button>
      </div>
    </AuthLayout>
  );
}
