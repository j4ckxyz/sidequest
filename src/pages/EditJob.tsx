import { useNavigate, useParams, Link } from 'react-router-dom';
import { JobForm, type JobFormSubmitValues } from '../components/jobs/JobForm';
import { useJob, useUpdateJob } from '../hooks/useJobs';
import { useAuth } from '../context/AuthProvider';
import { useToast } from '../context/ToastProvider';
import { PageSpinner } from '../components/ui/Spinner';

export function EditJob() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: job, isLoading } = useJob(id);
  const { mutate, isPending } = useUpdateJob();

  if (isLoading) return <PageSpinner />;
  if (!job) return <p className="px-6 py-10 text-center text-text-muted">Job not found.</p>;
  if (!user || user.id !== job.poster_id) {
    return <p className="px-6 py-10 text-center text-text-muted">You can only edit your own jobs.</p>;
  }
  if (job.status !== 'open') {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-text-muted">This job can't be edited once it's {job.status.replace('_', ' ')}.</p>
        <Link to={`/jobs/${job.id}`} className="mt-3 inline-block text-sm text-primary hover:underline">
          Back to job
        </Link>
      </div>
    );
  }

  function submit(values: JobFormSubmitValues) {
    if (!job) return;
    mutate(
      { id: job.id, patch: values },
      {
        onSuccess: () => {
          showToast('Job updated.');
          navigate(`/jobs/${job.id}`);
        },
        onError: (err) => showToast(err instanceof Error ? err.message : 'Could not update job.', 'error'),
      },
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display text-2xl text-text">Edit job</h1>
      <div className="mt-7">
        <JobForm
          defaultValues={{
            title: job.title,
            description: job.description,
            category: job.category,
            parish: job.parish,
            location_detail: job.location_detail ?? '',
            budget_type: job.budget_type,
            budget_amount: job.budget_amount != null ? String(job.budget_amount) : '',
            estimated_hours: job.estimated_hours != null ? String(job.estimated_hours) : '',
            date_needed: job.date_needed.slice(0, 10),
            is_flexible_date: job.is_flexible_date,
          }}
          defaultPhotos={job.photos}
          onSubmit={submit}
          isSubmitting={isPending}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
