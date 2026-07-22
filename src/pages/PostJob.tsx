import { useNavigate } from 'react-router-dom';
import { JobForm, type JobFormSubmitValues } from '../components/jobs/JobForm';
import { useCreateJob } from '../hooks/useJobs';
import { useAuth } from '../context/AuthProvider';
import { useToast } from '../context/ToastProvider';

export function PostJob() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { mutate, isPending } = useCreateJob();

  if (!user) return null;
  const posterId = user.id;

  function submit(values: JobFormSubmitValues) {
    mutate(
      { ...values, poster_id: posterId },
      {
        onSuccess: (job) => {
          showToast('Job posted — good luck!');
          navigate(`/jobs/${job.id}`);
        },
        onError: (err) => showToast(err instanceof Error ? err.message : 'Could not post job.', 'error'),
      },
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl text-text">Post a job</h1>
      <p className="mt-1 text-sm text-text-muted">Be specific — the clearer the ask, the faster someone local will pick it up.</p>
      <div className="mt-7">
        <JobForm onSubmit={submit} isSubmitting={isPending} submitLabel="Post job" />
      </div>
    </div>
  );
}
