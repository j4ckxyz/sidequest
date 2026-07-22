import { Link } from 'react-router-dom';
import { MapPin, CalendarDays } from 'lucide-react';
import type { Job, Profile } from '../../types/models';
import { JOB_CATEGORIES, JOB_STATUS_LABEL } from '../../lib/constants';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { StarRating } from '../ui/StarRating';
import { CategoryIcon } from './CategoryIcon';

const STATUS_TONE = {
  open: 'success',
  assigned: 'sea',
  in_progress: 'warning',
  completed: 'neutral',
  cancelled: 'danger',
} as const;

export function JobCard({ job, poster }: { job: Job; poster?: Profile | null }) {
  const category = JOB_CATEGORIES.find((c) => c.slug === job.category);

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="group flex flex-col rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <Badge tone="neutral" icon={category && <CategoryIcon name={category.icon} size={13} />}>
          {category?.label ?? job.category}
        </Badge>
        <Badge tone={STATUS_TONE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
      </div>

      <h3 className="mt-3.5 font-display text-lg leading-snug text-text group-hover:text-primary">{job.title}</h3>
      <p className="mt-1.5 line-clamp-2 text-sm text-text-muted">{job.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <MapPin size={13} /> {job.parish}
        </span>
        <span className="flex items-center gap-1">
          <CalendarDays size={13} /> {job.is_flexible_date ? 'Flexible' : formatDate(job.date_needed)}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        {poster ? (
          <div className="flex items-center gap-2">
            <Avatar name={poster.full_name} src={poster.avatar_url} size="sm" />
            <div className="leading-tight">
              <p className="text-sm text-text">{poster.full_name}</p>
              {poster.rating_count > 0 ? (
                <div className="flex items-center gap-1">
                  <StarRating value={poster.rating_avg} size={11} />
                  <span className="text-xs text-text-muted">({poster.rating_count})</span>
                </div>
              ) : (
                <span className="text-xs text-text-muted">New around here</span>
              )}
            </div>
          </div>
        ) : (
          <span />
        )}
        <p className="font-display text-base text-text">
          {formatCurrency(job.budget_amount)}
          {job.budget_type === 'hourly' && job.budget_amount != null && <span className="text-xs text-text-muted">/hr</span>}
        </p>
      </div>
    </Link>
  );
}
