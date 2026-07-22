import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import type { Profile } from '../../types/models';

/** True when a signed-in user is currently blocked from acting. */
export function userBlock(user: Pick<Profile, 'suspended' | 'banned_until' | 'ban_reason'> | null): {
  blocked: boolean;
  suspended: boolean;
  until: string | null;
  reason: string | null;
} {
  if (!user) return { blocked: false, suspended: false, until: null, reason: null };
  const timed = !!user.banned_until && new Date(user.banned_until).getTime() > Date.now();
  return {
    blocked: user.suspended || timed,
    suspended: user.suspended,
    until: timed ? user.banned_until : null,
    reason: user.ban_reason,
  };
}

export function BannedScreen() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const block = userBlock(user ?? null);

  const untilLabel = block.until
    ? new Date(block.until).toLocaleString('en-GB', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-soft">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-soft text-danger">
          <ShieldAlert size={26} />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-text">
          {block.suspended ? 'Your account is suspended' : 'Your account is temporarily restricted'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          {block.reason || 'This was actioned by SideQuest moderation for breaking the community rules.'}
        </p>
        {block.suspended ? (
          <p className="mt-3 text-sm text-text-muted">
            Suspensions are reviewed by a human admin. If you think this is a mistake, reply to your sign-up email and we'll take a look.
          </p>
        ) : untilLabel ? (
          <p className="mt-3 text-sm text-text-muted">
            You'll be able to post and message again after <span className="font-medium text-text">{untilLabel}</span>.
          </p>
        ) : null}
        <div className="mt-6">
          <Button variant="secondary" onClick={() => signOut().then(() => navigate('/'))}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
