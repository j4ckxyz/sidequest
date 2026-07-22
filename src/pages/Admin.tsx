import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldCheck, Trash2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useAllJobsAdmin, useAllProfiles, useAdminDeleteJob, useSetAdmin } from '../hooks/useAdmin';
import { useRefreshRecommendations } from '../hooks/useRecommendations';
import { JOB_CATEGORIES, JOB_STATUS_LABEL } from '../lib/constants';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { PageSpinner } from '../components/ui/Spinner';
import { useToast } from '../context/ToastProvider';
import { formatDate } from '../lib/utils';

const STATUS_TONE = { open: 'success', assigned: 'primary', in_progress: 'warning', completed: 'neutral', cancelled: 'danger' } as const;

export function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'jobs' | 'users'>('jobs');

  if (!user) return null;
  if (!user.is_admin) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center gap-2">
        <ShieldCheck size={20} className="text-sage" />
        <h1 className="text-2xl text-text">Admin</h1>
      </div>
      <p className="mt-1 text-sm text-text-muted">Moderate jobs and manage who else has admin access.</p>

      <RecommendationsPanel />

      <div className="mt-6 flex gap-1 border-b border-border">
        <button
          onClick={() => setTab('jobs')}
          className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${tab === 'jobs' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
        >
          All jobs
        </button>
        <button
          onClick={() => setTab('users')}
          className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${tab === 'users' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
        >
          All users
        </button>
      </div>

      <div className="mt-6">{tab === 'jobs' ? <JobsTab callerId={user.id} /> : <UsersTab callerId={user.id} />}</div>
    </div>
  );
}

function RecommendationsPanel() {
  const refresh = useRefreshRecommendations();
  const { showToast } = useToast();

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start gap-2.5">
        <Sparkles size={18} className="mt-0.5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium text-text">Recommendations</p>
          <p className="text-xs text-text-muted">
            Re-embed jobs and rebuild every user’s “Picked for you”. Runs hourly automatically — trigger it now after a batch of new jobs.
          </p>
        </div>
      </div>
      <Button
        size="md"
        variant="secondary"
        isLoading={refresh.isPending}
        onClick={() =>
          refresh.mutate(undefined, {
            onSuccess: () => showToast('Recommendations refreshed.'),
            onError: (err) => showToast(err instanceof Error ? err.message : 'Refresh failed.', 'error'),
          })
        }
      >
        <Sparkles size={14} /> Refresh now
      </Button>
    </div>
  );
}

function JobsTab({ callerId }: { callerId: string }) {
  const { data: jobs, isLoading } = useAllJobsAdmin(callerId);
  const deleteJob = useAdminDeleteJob();
  const { showToast } = useToast();

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
      {jobs?.length === 0 && <p className="p-5 text-sm text-text-muted">No jobs yet.</p>}
      {jobs?.map((job) => {
        const category = JOB_CATEGORIES.find((c) => c.slug === job.category);
        return (
          <div key={job.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm text-text">{job.title}</p>
              <p className="text-xs text-text-muted">
                {category?.label} · {job.parish} · posted {formatDate(job.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone={STATUS_TONE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
              <Button
                size="md"
                variant="secondary"
                onClick={() => {
                  if (!confirm(`Delete "${job.title}"? This can't be undone.`)) return;
                  deleteJob.mutate({ callerId, jobId: job.id }, { onSuccess: () => showToast('Job deleted.') });
                }}
                disabled={deleteJob.isPending}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UsersTab({ callerId }: { callerId: string }) {
  const { data: profiles, isLoading } = useAllProfiles(callerId);
  const setAdmin = useSetAdmin();
  const { showToast } = useToast();

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
      {profiles?.map((profile) => (
        <div key={profile.id} className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <Avatar name={profile.full_name} src={profile.avatar_url} size="sm" />
            <div>
              <p className="text-sm text-text">{profile.full_name}</p>
              <p className="text-xs text-text-muted">{profile.parish}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {profile.is_admin && <Badge tone="sage">Admin</Badge>}
            <Button
              size="md"
              variant="secondary"
              onClick={() =>
                setAdmin.mutate(
                  { callerId, targetId: profile.id, isAdmin: !profile.is_admin },
                  { onSuccess: () => showToast(profile.is_admin ? 'Admin access removed.' : 'Admin access granted.') },
                )
              }
              disabled={setAdmin.isPending || profile.id === callerId}
            >
              {profile.is_admin ? 'Remove admin' : 'Make admin'}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
