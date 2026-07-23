import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { MapPin, CalendarDays, Clock, BadgeCheck, Pencil, Ban, ArrowRight, Lock, Repeat, Users, Bot } from 'lucide-react';
import { useJob, useJobByPublicId, useCancelJob, useCompleteJob, useMarkJobInProgress } from '../hooks/useJobs';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../context/AuthProvider';
import { useApplicationsByJob } from '../hooks/useApplications';
import { useGetOrCreateConversation } from '../hooks/useMessages';
import { useHasReviewed, useCreateReview } from '../hooks/useReviews';
import { JOB_CATEGORIES, JOB_STATUS_LABEL, recurrenceLabel } from '../lib/constants';
import { formatCurrency, formatDate, jobPath, viewName, vtStyle } from '../lib/utils';
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
import { ReportButton } from '../components/moderation/ReportButton';
import { useToast } from '../context/ToastProvider';

const STATUS_TONE = { open: 'success', assigned: 'primary', in_progress: 'warning', completed: 'neutral', cancelled: 'danger' } as const;

export function JobDetail() {
  const { id, publicId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showToast } = useToast();

  // New canonical route resolves by public_id; legacy /jobs/:id resolves by uuid.
  const byPublic = useJobByPublicId(publicId);
  const byId = useJob(id);
  const { data: job, isLoading } = publicId ? byPublic : byId;
  const { data: poster } = useProfile(job?.poster_id);

  // Canonicalise the URL: send legacy uuid links (and stale usernames) to
  // /job/:username/:public_id once we know the job + poster.
  useEffect(() => {
    if (!job || !poster) return;
    const canonical = jobPath(job, poster);
    if (location.pathname !== canonical) navigate(canonical, { replace: true });
  }, [job, poster, location.pathname, navigate]);
  const { data: applications } = useApplicationsByJob(job?.id);

  const [applyOpen, setApplyOpen] = useState(false);

  const cancelJob = useCancelJob();
  const markInProgress = useMarkJobInProgress();
  const completeJob = useCompleteJob();
  const getOrCreateConversation = useGetOrCreateConversation();

  const isPoster = !!user && !!job && user.id === job.poster_id;
  const myApplication = applications?.find((a) => a.quester_id === user?.id);
  const isAssignedQuester = !!user && !!job && (user.id === job.assigned_quester_id || myApplication?.status === 'accepted');

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
  const vid = viewName(job.id);

  // Multi-person jobs hire several helpers (each an accepted application). Union
  // in the legacy single assigned_quester_id so nothing is missed. The poster
  // messages and reviews every hire, not just the first.
  const hiredIds = Array.from(
    new Set([
      ...(applications?.filter((a) => a.status === 'accepted').map((a) => a.quester_id) ?? []),
      ...(job.assigned_quester_id ? [job.assigned_quester_id] : []),
    ]),
  );

  async function messageCounterpart(counterpartId: string) {
    if (!user || !job) return;
    const posterId = isPoster ? user.id : job.poster_id;
    const questerId = isPoster ? counterpartId : user.id;
    const conv = await getOrCreateConversation.mutateAsync({ jobId: job.id, posterId, questerId });
    navigate(`/messages/${conv.id}`);
  }

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[1fr_320px]">
      <div style={vtStyle(`card-${vid}`)}>
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

        <h1 style={vtStyle(`title-${vid}`)} className="mt-4 text-3xl leading-tight text-text">{job.title}</h1>

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

        {user && !isPoster && (
          <div className="mt-4">
            <ReportButton targetType="job" targetId={job.id} label={job.title} />
          </div>
        )}

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
              <Link to="/login" state={{ from: location.pathname }} className="font-medium text-primary hover:underline">
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

        {user && job.status === 'completed' && isPoster && hiredIds.length > 0 && (
          <div className="mt-8 border-t border-border pt-6">
            <h2 className="mb-3 text-sm font-medium text-text-muted">
              Leave a review{hiredIds.length > 1 ? ' for each helper' : ''}
            </h2>
            <div className="flex flex-col gap-3">
              {hiredIds.map((hid) => (
                <HelperReviewRow key={hid} jobId={job.id} reviewerId={user.id} helperId={hid} />
              ))}
            </div>
          </div>
        )}

        {user && job.status === 'completed' && !isPoster && isAssignedQuester && (
          <div className="mt-8 border-t border-border pt-6">
            <ReviewControl jobId={job.id} reviewerId={user.id} revieweeId={job.poster_id} revieweeName={poster?.full_name ?? 'them'} />
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
              <Button onClick={() => navigate('/login', { state: { from: location.pathname } })} className="w-full">
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
            {user && !isPoster && job.status === 'open' && myApplication?.status === 'accepted' && (
              <Badge tone="success">You’re allocated — waiting for the remaining spots to fill</Badge>
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
                        onSuccess: () => showToast('Nice one — done! Leave a quick review below.'),
                      })
                    }
                    isLoading={completeJob.isPending}
                  >
                    Mark as done
                  </Button>
                )}
              </>
            )}

            {isPoster && (job.status === 'assigned' || job.status === 'in_progress') && hiredIds.length > 0 && (
              <>
                {hiredIds.map((hid) => (
                  <HiredHelperRow key={hid} helperId={hid} onMessage={messageCounterpart} />
                ))}
                <Button
                  className="w-full"
                  onClick={() =>
                    completeJob.mutate(job.id, {
                      onSuccess: () => showToast('Marked as completed — leave a review below.'),
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
    </div>
  );
}

// One hired helper in the poster's action panel: their identity + a direct message.
function HiredHelperRow({ helperId, onMessage }: { helperId: string; onMessage: (id: string) => void }) {
  const { data: helper } = useProfile(helperId);
  if (!helper) return null;
  return (
    <>
      <div className="flex items-center gap-2 rounded-xl bg-sage-soft px-3 py-2.5 text-sm text-text">
        <Avatar name={helper.full_name} src={helper.avatar_url} size="sm" />
        Hired: {helper.full_name}
      </div>
      <Button variant="secondary" className="w-full" onClick={() => onMessage(helper.id)}>
        Message {helper.full_name.split(' ')[0]}
      </Button>
    </>
  );
}

// Resolves a hired helper's name, then renders a per-helper review control.
function HelperReviewRow({ jobId, reviewerId, helperId }: { jobId: string; reviewerId: string; helperId: string }) {
  const { data: helper } = useProfile(helperId);
  if (!helper) return null;
  return <ReviewControl jobId={jobId} reviewerId={reviewerId} revieweeId={helper.id} revieweeName={helper.full_name} />;
}

// A single review action, scoped to one reviewee. Tracks whether this exact
// (job, reviewer, reviewee) has already been reviewed so multi-person jobs let
// the poster review each helper independently.
function ReviewControl({
  jobId,
  reviewerId,
  revieweeId,
  revieweeName,
}: {
  jobId: string;
  reviewerId: string;
  revieweeId: string;
  revieweeName: string;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const createReview = useCreateReview();
  const { data: hasReviewed } = useHasReviewed(jobId, reviewerId, revieweeId);

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-text">{revieweeName}</span>
      {hasReviewed ? (
        <span className="shrink-0 text-sm text-text-muted">Reviewed ✓</span>
      ) : (
        <Button variant="secondary" className="shrink-0" onClick={() => setOpen(true)}>
          Leave a review
        </Button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={`Review ${revieweeName}`}>
        <ReviewForm
          revieweeName={revieweeName}
          isSubmitting={createReview.isPending}
          onSubmit={(rating, comment) =>
            createReview.mutate(
              { job_id: jobId, reviewer_id: reviewerId, reviewee_id: revieweeId, rating, comment },
              {
                onSuccess: () => {
                  showToast('Review posted, thank you.');
                  setOpen(false);
                },
                onError: (err) => showToast(err instanceof Error ? err.message : 'Could not post review.', 'error'),
              },
            )
          }
        />
      </Modal>
    </div>
  );
}
