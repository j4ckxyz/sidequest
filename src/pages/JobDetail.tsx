import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MapPin, CalendarDays, Clock, BadgeCheck, Pencil, Ban, ArrowRight, Lock, Repeat, Users, Bot } from 'lucide-react';
import { useJob, useCancelJob, useCompleteJob, useMarkJobInProgress } from '../hooks/useJobs';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../context/AuthProvider';
import { useApplicationsByJob } from '../hooks/useApplications';
import { useGetOrCreateConversation } from '../hooks/useMessages';
import { useHasReviewed, useCreateReview } from '../hooks/useReviews';
import { JOB_CATEGORIES, JOB_STATUS_LABEL, recurrenceLabel } from '../lib/constants';
import { formatCurrency, formatDate } from '../lib/utils';
import { CategoryIcon } from '../components/jobs/CategoryIcon';
import { JobMap } from '../components/jobs/JobMap';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { StarRating } from '../components/ui/StarRating';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageSpinner } from '../components/ui/Spinner';
import { ApplyModal } from '../components/applications/ApplyModal';
import { Modal } from '../components/ui/Modal';
import { ReviewForm } from '../components/reviews/ReviewForm';
import { useToast } from '../context/ToastProvider';

const STATUS_TONE = { open: 'success', assigned: 'primary', in_progress: 'warning', completed: 'neutral', cancelled: 'danger' } as const;

export function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const { data: job, isLoading } = useJob(id);
  const { data: poster } = useProfile(job?.poster_id);
  const { data: quester } = useProfile(job?.assigned_quester_id ?? undefined);
  const { data: applications } = useApplicationsByJob(job?.id);

  const [applyOpen, setApplyOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const cancelJob = useCancelJob();
  const markInProgress = useMarkJobInProgress();
  const completeJob = useCompleteJob();
  const getOrCreateConversation = useGetOrCreateConversation();
  const createReview = useCreateReview();

  const isPoster = !!user && !!job && user.id === job.poster_id;
  const isAssignedQuester = !!user && !!job && user.id === job.assigned_quester_id;
  const myApplication = applications?.find((a) => a.quester_id === user?.id);
  const revieweeId = isPoster ? job?.assigned_quester_id : job?.poster_id;
  const { data: hasReviewed } = useHasReviewed(job?.status === 'completed' ? job.id : undefined, user?.id);

  if (isLoading) return <PageSpinner />;
  if (!job) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="text-xl text-text">Job not found</p>
        <Link to="/jobs" className="mt-3 inline-block text-sm text-primary hover:underline">
          Back to browse
        </Link>
      </div>
    );
  }

  const category = JOB_CATEGORIES.find((c) => c.slug === job.category);

  async function messageCounterpart(counterpartId: string) {
    if (!user || !job) return;
    const posterId = isPoster ? user.id : job.poster_id;
    const questerId = isPoster ? counterpartId : user.id;
    const conv = await getOrCreateConversation.mutateAsync({ jobId: job.id, posterId, questerId });
    navigate(`/messages/${conv.id}`);
  }

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="flex items-center gap-2">
          <Badge tone="neutral" icon={category && <CategoryIcon name={category.icon} size={13} />}>
            {category?.label}
          </Badge>
          <Badge tone={STATUS_TONE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
          {job.slots > 1 && (
            <Badge tone="primary" icon={<Users size={13} />}>
              Needs {job.slots} people
            </Badge>
          )}
        </div>

        <h1 className="mt-4 text-3xl leading-tight text-text">{job.title}</h1>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-muted">
          <span className="flex items-center gap-1.5">
            {user ? (
              <>
                <MapPin size={15} /> {job.parish}
                {job.location_detail && ` · ${job.location_detail}`}
              </>
            ) : (
              <>
                <Lock size={14} /> Location shown after sign in
              </>
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays size={15} />{' '}
            {job.is_flexible_date || !job.date_needed ? 'Flexible date' : formatDate(job.date_needed, { day: 'numeric', month: 'long' })}
          </span>
          {job.is_recurring && recurrenceLabel(job.recurrence) && (
            <span className="flex items-center gap-1.5">
              <Repeat size={15} /> {recurrenceLabel(job.recurrence)}
            </span>
          )}
          {job.estimated_hours && (
            <span className="flex items-center gap-1.5">
              <Clock size={15} /> ~{job.estimated_hours}h
            </span>
          )}
        </div>

        <p className="mt-6 max-w-[65ch] whitespace-pre-line text-base leading-relaxed text-text">{job.description}</p>

        {job.photos.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {job.photos.map((src, i) => (
              <img key={i} src={src} alt="" className="aspect-square rounded-xl object-cover" />
            ))}
          </div>
        )}

        {user ? (
          <div className="mt-6">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-text-muted">
              <MapPin size={15} /> {job.parish}
              {job.location_detail && <span>· {job.location_detail}</span>}
            </h2>
            <JobMap parish={job.parish} lat={job.location_lat} lng={job.location_lng} />
          </div>
        ) : (
          <div className="mt-6 flex items-center gap-2.5 rounded-lg border border-dashed border-border px-4 py-4 text-sm text-text-muted">
            <Lock size={16} className="shrink-0" />
            <span>
              Location and the poster’s details are hidden.{' '}
              <Link to="/login" state={{ from: `/jobs/${job.id}` }} className="font-medium text-primary hover:underline">
                Sign in
              </Link>{' '}
              to see them.
            </span>
          </div>
        )}

        {isPoster && job.status === 'open' && (
          <div className="mt-8 rounded-lg border border-border bg-surface-2/60 p-4 text-sm text-text-muted">
            {applications?.length ?? 0} {applications?.length === 1 ? 'person has' : 'people have'} applied.{' '}
            <Link to="/dashboard/posted" className="font-medium text-primary hover:underline">
              Review applicants
            </Link>
          </div>
        )}

        {job.status === 'completed' && revieweeId && (isPoster || isAssignedQuester) && (
          <div className="mt-8 border-t border-border pt-6">
            {hasReviewed ? (
              <p className="text-sm text-text-muted">You've already left a review for this job. Thanks for keeping SideQuest trustworthy.</p>
            ) : (
              <Button variant="secondary" onClick={() => setReviewOpen(true)}>
                Leave a review
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Card className="p-5">
          {user && poster && (
            <Link to={`/profile/${poster.id}`} className="flex items-center gap-3 hover:opacity-80">
              <Avatar name={poster.full_name} src={poster.avatar_url} size="lg" />
              <div>
                <p className="flex items-center gap-1 text-base text-text">
                  {poster.full_name}
                  {poster.is_bot && <Bot size={14} className="text-text-muted" />}
                  {poster.is_verified && <BadgeCheck size={14} className="text-sage" />}
                </p>
                {poster.rating_count > 0 ? (
                  <div className="flex items-center gap-1">
                    <StarRating value={poster.rating_avg} size={12} />
                    <span className="text-xs text-text-muted">({poster.rating_count})</span>
                  </div>
                ) : (
                  <span className="text-xs text-text-muted">New around here</span>
                )}
              </div>
            </Link>
          )}

          <p className="mt-5 text-2xl text-text">
            {formatCurrency(job.budget_amount)}
            {job.budget_type === 'hourly' && job.budget_amount != null && <span className="text-sm text-text-muted"> /hr</span>}
          </p>
          {job.budget_type === 'negotiable' && <p className="text-xs text-text-muted">Rate to be agreed</p>}

          <div className="mt-5 flex flex-col gap-2">
            {!user && (
              <Button onClick={() => navigate('/login', { state: { from: `/jobs/${job.id}` } })} className="w-full">
                Log in to apply
              </Button>
            )}

            {user && !isPoster && job.status === 'open' && !myApplication && (
              <Button onClick={() => setApplyOpen(true)} className="w-full">
                Apply for this job
              </Button>
            )}
            {user && !isPoster && myApplication?.status === 'pending' && (
              <Badge tone="warning">Application sent — waiting to hear back</Badge>
            )}
            {user && !isPoster && myApplication?.status === 'rejected' && <Badge tone="neutral">Not chosen this time</Badge>}

            {isAssignedQuester && (job.status === 'assigned' || job.status === 'in_progress') && (
              <>
                <Button variant="secondary" className="w-full" onClick={() => messageCounterpart(job.poster_id)}>
                  Message {poster?.full_name.split(' ')[0]}
                </Button>
                {job.status === 'assigned' && (
                  <Button className="w-full" onClick={() => markInProgress.mutate(job.id)} isLoading={markInProgress.isPending}>
                    Mark as started <ArrowRight size={15} />
                  </Button>
                )}
                {job.status === 'in_progress' && (
                  <Button
                    className="w-full"
                    onClick={() =>
                      completeJob.mutate(job.id, {
                        onSuccess: () => {
                          showToast('Nice one — done! Leave a quick review.');
                          setReviewOpen(true);
                        },
                      })
                    }
                    isLoading={completeJob.isPending}
                  >
                    Mark as done
                  </Button>
                )}
              </>
            )}

            {isPoster && (job.status === 'assigned' || job.status === 'in_progress') && quester && (
              <>
                <div className="flex items-center gap-2 rounded-xl bg-sage-soft px-3 py-2.5 text-sm text-text">
                  <Avatar name={quester.full_name} src={quester.avatar_url} size="sm" />
                  Hired: {quester.full_name}
                </div>
                <Button variant="secondary" className="w-full" onClick={() => messageCounterpart(quester.id)}>
                  Message {quester.full_name.split(' ')[0]}
                </Button>
                <Button
                  className="w-full"
                  onClick={() =>
                    completeJob.mutate(job.id, {
                      onSuccess: () => {
                        showToast('Marked as completed — leave a quick review.');
                        setReviewOpen(true);
                      },
                    })
                  }
                  isLoading={completeJob.isPending}
                >
                  Mark as completed
                </Button>
              </>
            )}

            {isPoster && (job.status === 'open' || job.status === 'assigned') && (
              <div className="flex gap-2">
                <Link
                  to={`/jobs/${job.id}/edit`}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-sm font-medium text-text hover:bg-surface-2"
                >
                  <Pencil size={14} /> Edit
                </Link>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => cancelJob.mutate(job.id, { onSuccess: () => showToast('Job cancelled.') })}
                  isLoading={cancelJob.isPending}
                >
                  <Ban size={14} /> Cancel
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {user && (
        <ApplyModal job={job} questerId={user.id} open={applyOpen} onClose={() => setApplyOpen(false)} />
      )}

      {user && revieweeId && (
        <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="Leave a review">
          <ReviewForm
            revieweeName={(isPoster ? quester?.full_name : poster?.full_name) ?? 'them'}
            isSubmitting={createReview.isPending}
            onSubmit={(rating, comment) =>
              createReview.mutate(
                { job_id: job.id, reviewer_id: user.id, reviewee_id: revieweeId, rating, comment },
                {
                  onSuccess: () => {
                    showToast('Review posted, thank you.');
                    setReviewOpen(false);
                  },
                  onError: (err) => showToast(err instanceof Error ? err.message : 'Could not post review.', 'error'),
                },
              )
            }
          />
        </Modal>
      )}
    </div>
  );
}
