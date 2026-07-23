import { flushSync } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, CalendarDays, Lock, Repeat, Bot } from 'lucide-react';
import type { Job, Profile } from '../../types/models';
import { JOB_CATEGORIES, JOB_STATUS_LABEL, recurrenceLabel } from '../../lib/constants';
import { formatCurrency, formatDate, jobPath, viewName } from '../../lib/utils';
import { haptic } from '../../lib/haptics';
import { queryClient } from '../../lib/queryClient';
import { useAuth } from '../../context/AuthProvider';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { StarRating } from '../ui/StarRating';
import { CategoryIcon } from './CategoryIcon';

const STATUS_TONE = {
  open: 'success',
  assigned: 'primary',
  in_progress: 'warning',
  completed: 'neutral',
  cancelled: 'danger',
} as const;

export function JobCard({ job, poster }: { job: Job; poster?: Profile | null }) {
  const category = JOB_CATEGORIES.find((c) => c.slug === job.category);
  const { user } = useAuth();
  const navigate = useNavigate();

  const vid = viewName(job.id);
  const to = jobPath(job, poster);

  // Morph the clicked card into the detail page. The JSX <BrowserRouter> doesn't
  // wire up React Router's own viewTransition, so we drive it ourselves: seed the
  // detail's query cache from the job we already hold (so it renders synchronously
  // with its named elements present), then flushSync the navigation inside a
  // View Transition. Modified clicks, reduced-motion, and no-VT browsers fall
  // through to the plain <Link>.
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    haptic('tap');
    const startViewTransition = document.startViewTransition?.bind(document);
    if (!startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    e.preventDefault();
    const el = e.currentTarget;
    el.style.setProperty('view-transition-name', `card-${vid}`);
    el.querySelector<HTMLElement>('[data-vt-title]')?.style.setProperty('view-transition-name', `title-${vid}`);
    // Seed the by-public-id cache so JobDetail renders synchronously (named
    // elements present) and the morph lands rather than flashing a spinner.
    queryClient.setQueryData(['jobs', 'detail', 'pub', job.public_id], job);
    startViewTransition(() => flushSync(() => navigate(to)));
  }

  return (
    <Link
      to={to}
      onClick={handleClick}
      className="group flex h-full flex-col rounded-lg border border-border bg-surface p-5 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <Badge tone="neutral" icon={category && <CategoryIcon name={category.icon} size={13} />}>
          {category?.label ?? job.category}
        </Badge>
        <Badge tone={STATUS_TONE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
      </div>

      <h3 data-vt-title className="mt-3.5 text-lg leading-snug text-text group-hover:text-primary">{job.title}</h3>
      <p className="mt-1.5 line-clamp-2 text-sm text-text-muted">{job.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          {user ? (
            <>
              <MapPin size={13} /> {job.parish}
            </>
          ) : (
            <>
              <Lock size={12} /> Location hidden
            </>
          )}
        </span>
        <span className="flex items-center gap-1">
          <CalendarDays size={13} /> {job.is_flexible_date || !job.date_needed ? 'Flexible' : formatDate(job.date_needed)}
        </span>
        {job.is_recurring && recurrenceLabel(job.recurrence) && (
          <span className="flex items-center gap-1 text-primary">
            <Repeat size={13} /> {recurrenceLabel(job.recurrence)}
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
        {user && poster ? (
          <div className="flex min-w-0 items-center gap-2">
            <Avatar name={poster.full_name} src={poster.avatar_url} size="sm" />
            <div className="min-w-0 leading-tight">
              <p className="flex items-center gap-1 truncate text-sm text-text">
                <span className="truncate">{poster.full_name}</span>
                {poster.is_bot && <Bot size={13} className="shrink-0 text-text-muted" />}
              </p>
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
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <Lock size={12} /> Sign in to see who posted
          </span>
        )}
        <p className="shrink-0 text-base text-text">
          {formatCurrency(job.budget_amount)}
          {job.budget_type === 'hourly' && job.budget_amount != null && <span className="text-xs text-text-muted">/hr</span>}
        </p>
      </div>
    </Link>
  );
}
