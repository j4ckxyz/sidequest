import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useApplicationsByQuester, useWithdrawApplication } from '../hooks/useApplications';
import { useJob } from '../hooks/useJobs';
import { ApplicationCard } from '../components/applications/ApplicationCard';
import { EmptyState } from '../components/ui/EmptyState';
import { PageSpinner } from '../components/ui/Spinner';
import { useToast } from '../context/ToastProvider';
import type { Application } from '../types/models';

export function DashboardApplications() {
  const { user } = useAuth();
  const { data: applications, isLoading } = useApplicationsByQuester(user?.id);

  if (isLoading) return <PageSpinner />;
  if (!applications || applications.length === 0) {
    return (
      <EmptyState
        icon={<Search size={28} />}
        title="No applications yet"
        description="Browse open jobs nearby and apply to the ones that suit you."
        action={
          <Link to="/jobs" className="text-sm font-medium text-primary hover:underline">
            Browse jobs
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {applications.map((application) => (
        <ApplicationRow key={application.id} application={application} />
      ))}
    </div>
  );
}

function ApplicationRow({ application }: { application: Application }) {
  const { data: job } = useJob(application.job_id);
  const withdraw = useWithdrawApplication();
  const { showToast } = useToast();

  return (
    <ApplicationCard
      application={application}
      job={job}
      viewer="quester"
      onWithdraw={() => withdraw.mutate(application.id, { onSuccess: () => showToast('Application withdrawn.') })}
      busy={withdraw.isPending}
    />
  );
}
