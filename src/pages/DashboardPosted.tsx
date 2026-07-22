import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useJobsByPoster } from '../hooks/useJobs';
import { useApplicationsByJob, useAcceptApplication, useRejectApplication } from '../hooks/useApplications';
import { useProfile } from '../hooks/useProfile';
import { JOB_CATEGORIES, JOB_STATUS_LABEL } from '../lib/constants';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ApplicationCard } from '../components/applications/ApplicationCard';
import { PageSpinner } from '../components/ui/Spinner';
import { useToast } from '../context/ToastProvider';
import type { Job } from '../types/models';

const STATUS_TONE = { open: 'success', assigned: 'primary', in_progress: 'warning', completed: 'neutral', cancelled: 'danger' } as const;

export function DashboardPosted() {
  const { user } = useAuth();
  const { data: jobs, isLoading } = useJobsByPoster(user?.id);

  if (isLoading) return <PageSpinner />;
  if (!jobs || jobs.length === 0) {
    return (
      <EmptyState
        icon={<Inbox size={28} />}
        title="You haven't posted any jobs yet"
        description="Post a short job and locals nearby can apply within minutes."
        action={
          <Link to="/jobs/new" className="text-sm font-medium text-primary hover:underline">
            Post your first job
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {jobs.map((job) => (
        <PostedJobRow key={job.id} job={job} />
      ))}
    </div>
  );
}

function PostedJobRow({ job }: { job: Job }) {
  const { data: applications, isLoading } = useApplicationsByJob(job.id);
  const accept = useAcceptApplication();
  const reject = useRejectApplication();
  const { showToast } = useToast();
  const category = JOB_CATEGORIES.find((c) => c.slug === job.category);

  const pendingOrRelevant = applications?.filter((a) => job.status === 'open' ? a.status === 'pending' : a.status === 'accepted') ?? [];

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to={`/jobs/${job.id}`} className="text-lg text-text hover:text-primary">
          {job.title}
        </Link>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">{category?.label}</Badge>
          <Badge tone={STATUS_TONE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {isLoading && <p className="text-sm text-text-muted">Loading applicants…</p>}
        {!isLoading && pendingOrRelevant.length === 0 && (
          <p className="text-sm text-text-muted">
            {job.status === 'open' ? 'No applicants yet.' : job.status === 'cancelled' ? 'This job was cancelled.' : 'No one currently assigned.'}
          </p>
        )}
        {pendingOrRelevant.map((application) => (
          <ApplicantRow
            key={application.id}
            applicationId={application.id}
            questerId={application.quester_id}
            message={application.message}
            status={application.status}
            proposedAmount={application.proposed_amount}
            createdAt={application.created_at}
            onAccept={() => accept.mutate(application.id, { onSuccess: () => showToast('Hired! Contact details are now shared.') })}
            onReject={() => reject.mutate(application.id)}
            busy={accept.isPending || reject.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function ApplicantRow({
  applicationId,
  questerId,
  message,
  status,
  proposedAmount,
  createdAt,
  onAccept,
  onReject,
  busy,
}: {
  applicationId: string;
  questerId: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  proposedAmount: number | null;
  createdAt: string;
  onAccept: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const { data: applicant } = useProfile(questerId);
  return (
    <ApplicationCard
      application={{ id: applicationId, job_id: '', quester_id: questerId, message, proposed_amount: proposedAmount, status, created_at: createdAt }}
      applicant={applicant}
      viewer="poster"
      onAccept={onAccept}
      onReject={onReject}
      busy={busy}
      nested
    />
  );
}
