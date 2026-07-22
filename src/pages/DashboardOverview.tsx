import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardList, MessageSquare, Star, Users, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useJobsByPoster, useJobsAssignedTo } from '../hooks/useJobs';
import { useApplicationsByQuester, useApplicationsByJob } from '../hooks/useApplications';
import { useUnreadCount } from '../hooks/useMessages';
import { useJob } from '../hooks/useJobs';
import { useHasReviewed } from '../hooks/useReviews';
import { JOB_STATUS_LABEL, APPLICATION_STATUS_LABEL, type JobStatus } from '../lib/constants';
import { formatCurrency, formatDate } from '../lib/utils';
import { Badge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import type { Job, Application } from '../types/models';

const STATUS_TONE = { open: 'success', assigned: 'primary', in_progress: 'warning', completed: 'neutral', cancelled: 'danger' } as const;
const APP_TONE = { pending: 'warning', accepted: 'success', rejected: 'neutral', withdrawn: 'neutral' } as const;

const ACTIVE_JOB: JobStatus[] = ['open', 'assigned', 'in_progress'];
const ACTIVE_APP = ['pending', 'accepted'] as const;

export function DashboardOverview() {
  const { user } = useAuth();
  const { data: posted, isLoading: lp } = useJobsByPoster(user?.id);
  const { data: assigned, isLoading: la } = useJobsAssignedTo(user?.id);
  const { data: myApps, isLoading: lm } = useApplicationsByQuester(user?.id);
  const unread = useUnreadCount(user?.id);

  if (lp || la || lm) return <PageSpinner />;

  const postedJobs = posted ?? [];
  const assignedJobs = assigned ?? [];
  const applications = myApps ?? [];

  const openPosted = postedJobs.filter((j) => j.status === 'open');
  const activePosted = postedJobs.filter((j) => ACTIVE_JOB.includes(j.status));
  const activeApps = applications.filter((a) => ACTIVE_APP.includes(a.status as (typeof ACTIVE_APP)[number]));
  const upcoming = assignedJobs.filter((j) => j.status === 'assigned' || j.status === 'in_progress');
  const completed = [...postedJobs, ...assignedJobs].filter((j) => j.status === 'completed');
  const completedUnique = Array.from(new Map(completed.map((j) => [j.id, j])).values());

  // Sync-computable attention items — guarantees a correct "all caught up" empty state.
  const acceptedApps = applications.filter((a) => a.status === 'accepted');
  const hasAttention = acceptedApps.length > 0 || upcoming.length > 0 || unread > 0;

  return (
    <div className="flex flex-col gap-8">
      <StatStrip
        stats={[
          { label: 'Open jobs', value: openPosted.length },
          { label: 'Active applications', value: activeApps.length },
          { label: 'Jobs to do', value: upcoming.length },
          { label: 'Unread messages', value: unread },
        ]}
      />

      <section>
        <SectionHeading>Needs your attention</SectionHeading>
        {hasAttention ? (
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {unread > 0 && (
              <AttentionRow
                icon={<MessageSquare size={16} className="text-primary" />}
                text={`${unread} unread ${unread === 1 ? 'message' : 'messages'}`}
                to="/messages"
                cta="Open"
              />
            )}
            {acceptedApps.map((a) => (
              <AcceptedAppRow key={a.id} application={a} />
            ))}
            {upcoming.map((j) => (
              <AttentionRow
                key={j.id}
                icon={<ClipboardList size={16} className="text-primary" />}
                text={`“${j.title}” — mark it complete once the work is done`}
                to={`/jobs/${j.id}`}
                cta="View"
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-border px-4 py-5 text-sm text-text-muted">
            <CheckCircle2 size={18} className="text-success" />
            You’re all caught up — nothing needs action right now.
          </div>
        )}
      </section>

      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <SectionHeading className="mb-0">Your active jobs</SectionHeading>
          <Link to="/dashboard/posted" className="text-sm font-medium text-primary hover:underline">
            View all posted
          </Link>
        </div>
        {activePosted.length > 0 ? (
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {activePosted.map((j) => (
              <PostedJobRow key={j.id} job={j} />
            ))}
          </div>
        ) : (
          <EmptyRow text="No active jobs posted." to="/jobs/new" cta="Post a job" />
        )}
      </section>

      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <SectionHeading className="mb-0">Your applications</SectionHeading>
          <Link to="/dashboard/applications" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {activeApps.length > 0 ? (
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {activeApps.map((a) => (
              <AppRow key={a.id} application={a} />
            ))}
          </div>
        ) : (
          <EmptyRow text="You haven’t applied for anything yet." to="/jobs" cta="Browse jobs" />
        )}
      </section>

      {completedUnique.length > 0 && (
        <section>
          <SectionHeading>Recently completed</SectionHeading>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {completedUnique.slice(0, 5).map((j) => (
              <CompletedRow key={j.id} job={j} userId={user!.id} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeading({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`mb-2.5 text-base font-semibold text-text ${className}`}>{children}</h2>;
}

function StatStrip({ stats }: { stats: { label: string; value: number }[] }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface sm:grid-cols-4 sm:divide-y-0">
      {stats.map((s) => (
        <div key={s.label} className="px-4 py-3">
          <p className="text-2xl font-semibold text-text">{s.value}</p>
          <p className="text-xs text-text-muted">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function RowShell({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 px-4 py-3">{children}</div>;
}

function AttentionRow({ icon, text, to, cta }: { icon: React.ReactNode; text: string; to: string; cta: string }) {
  return (
    <RowShell>
      <span className="flex min-w-0 items-center gap-2.5 text-sm text-text">
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{text}</span>
      </span>
      <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline">
        {cta} <ArrowRight size={14} />
      </Link>
    </RowShell>
  );
}

function AcceptedAppRow({ application }: { application: Application }) {
  const { data: job } = useJob(application.job_id);
  return (
    <AttentionRow
      icon={<CheckCircle2 size={16} className="text-success" />}
      text={job ? `You’re hired for “${job.title}” — arrange the details` : 'You were hired for a job'}
      to={`/jobs/${application.job_id}`}
      cta="View"
    />
  );
}

function PostedJobRow({ job }: { job: Job }) {
  const { data: apps } = useApplicationsByJob(job.id);
  const pending = apps?.filter((a) => a.status === 'pending').length ?? 0;
  return (
    <RowShell>
      <Link to={`/jobs/${job.id}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text hover:text-primary">{job.title}</p>
        <p className="mt-0.5 text-xs text-text-muted">
          {job.is_flexible_date || !job.date_needed ? 'Flexible date' : formatDate(job.date_needed)}
          {job.status === 'open' && ` · ${pending} ${pending === 1 ? 'applicant' : 'applicants'}`}
        </p>
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        {job.status === 'open' && pending > 0 && (
          <Link
            to="/dashboard/posted"
            className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2 py-1 text-xs font-medium text-primary hover:underline"
          >
            <Users size={13} /> Review
          </Link>
        )}
        <Badge tone={STATUS_TONE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
      </div>
    </RowShell>
  );
}

function AppRow({ application }: { application: Application }) {
  const { data: job } = useJob(application.job_id);
  return (
    <RowShell>
      <Link to={`/jobs/${application.job_id}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text hover:text-primary">{job?.title ?? 'Loading…'}</p>
        <p className="mt-0.5 text-xs text-text-muted">
          Applied {formatDate(application.created_at)}
          {application.proposed_amount != null && ` · offered ${formatCurrency(application.proposed_amount)}`}
        </p>
      </Link>
      <Badge tone={APP_TONE[application.status]}>{APPLICATION_STATUS_LABEL[application.status]}</Badge>
    </RowShell>
  );
}

function CompletedRow({ job, userId }: { job: Job; userId: string }) {
  const { data: hasReviewed } = useHasReviewed(job.id, userId);
  return (
    <RowShell>
      <Link to={`/jobs/${job.id}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text hover:text-primary">{job.title}</p>
        <p className="mt-0.5 text-xs text-text-muted">Completed</p>
      </Link>
      {hasReviewed === false ? (
        <Link
          to={`/jobs/${job.id}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-warning-soft px-2 py-1 text-xs font-medium text-warning hover:underline"
        >
          <Star size={13} /> Leave a review
        </Link>
      ) : (
        <Badge tone="neutral">Done</Badge>
      )}
    </RowShell>
  );
}

function EmptyRow({ text, to, cta }: { text: string; to: string; cta: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border px-4 py-4 text-sm text-text-muted">
      {text}
      <Link to={to} className="font-medium text-primary hover:underline">
        {cta} →
      </Link>
    </div>
  );
}
