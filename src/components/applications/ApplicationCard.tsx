import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import type { Application, Job, Profile } from '../../types/models';
import { APPLICATION_STATUS_LABEL } from '../../lib/constants';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { StarRating } from '../ui/StarRating';
import { formatCurrency, formatRelativeTime } from '../../lib/utils';
import { cx } from '../../lib/utils';

const STATUS_TONE = { pending: 'warning', accepted: 'success', rejected: 'neutral', withdrawn: 'neutral' } as const;

export function ApplicationCard({
  application,
  applicant,
  job,
  viewer,
  onAccept,
  onReject,
  onWithdraw,
  busy,
  nested,
}: {
  application: Application;
  applicant?: Profile | null;
  job?: Job | null;
  viewer: 'poster' | 'quester';
  onAccept?: () => void;
  onReject?: () => void;
  onWithdraw?: () => void;
  busy?: boolean;
  /** Render as a flat row (no border/bg) when already inside another card, e.g. the posted-job applicant list. */
  nested?: boolean;
}) {
  return (
    <div className={cx(nested ? 'border-t border-border pt-4 first:border-none first:pt-0' : 'rounded-lg border border-border bg-surface p-5')}>
      <div className="flex items-start justify-between gap-3">
        {viewer === 'poster' && applicant ? (
          <Link to={`/profile/${applicant.id}`} className="flex items-center gap-3 hover:opacity-80">
            <Avatar name={applicant.full_name} src={applicant.avatar_url} size="md" />
            <div>
              <p className="text-base text-text">{applicant.full_name}</p>
              {applicant.rating_count > 0 ? (
                <div className="flex items-center gap-1">
                  <StarRating value={applicant.rating_avg} size={12} />
                  <span className="text-xs text-text-muted">({applicant.rating_count})</span>
                </div>
              ) : (
                <span className="text-xs text-text-muted">New around here</span>
              )}
            </div>
          </Link>
        ) : job ? (
          <Link to={`/jobs/${job.id}`} className="hover:opacity-80">
            <p className="text-base text-text">{job.title}</p>
            <p className="text-xs text-text-muted">{job.parish}</p>
          </Link>
        ) : (
          <div />
        )}
        <Badge tone={STATUS_TONE[application.status]}>{APPLICATION_STATUS_LABEL[application.status]}</Badge>
      </div>

      {application.message && <p className="mt-3.5 text-sm text-text-muted">{application.message}</p>}

      <div className="mt-3.5 flex items-center justify-between">
        <span className="text-xs text-text-muted">
          Applied {formatRelativeTime(application.created_at)}
          {application.proposed_amount != null && <> · proposed {formatCurrency(application.proposed_amount)}</>}
        </span>

        {viewer === 'poster' && application.status === 'pending' && (
          <div className="flex gap-2">
            <Button size="md" variant="secondary" onClick={onReject} disabled={busy}>
              <X size={14} /> Decline
            </Button>
            <Button size="md" onClick={onAccept} disabled={busy}>
              <Check size={14} /> Hire
            </Button>
          </div>
        )}
        {viewer === 'quester' && application.status === 'pending' && (
          <Button size="md" variant="secondary" onClick={onWithdraw} disabled={busy}>
            Withdraw
          </Button>
        )}
      </div>
    </div>
  );
}
