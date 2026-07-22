import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useProfile, useProfileByUsername } from '../hooks/useProfile';
import { useReviewsFor } from '../hooks/useReviews';
import { useJobsByPoster, useJobsAssignedTo } from '../hooks/useJobs';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileStats } from '../components/profile/ProfileStats';
import { ReviewCard } from '../components/reviews/ReviewCard';
import { CategoryIcon } from '../components/jobs/CategoryIcon';
import { PageSpinner } from '../components/ui/Spinner';
import { Card } from '../components/ui/Card';
import { JOB_CATEGORIES } from '../lib/constants';
import type { Review } from '../types/models';

export function ProfileView() {
  const { id, username } = useParams();
  const { user } = useAuth();

  const byId = useProfile(username ? undefined : id);
  const byUsername = useProfileByUsername(username);
  const profile = username ? byUsername.data : byId.data;
  const isLoading = username ? byUsername.isLoading : byId.isLoading;

  const { data: reviews } = useReviewsFor(profile?.id);
  const { data: posted } = useJobsByPoster(profile?.id);
  const { data: assigned } = useJobsAssignedTo(profile?.id);

  // Factual track record: completed jobs grouped by category (as poster or helper).
  const history = useMemo(() => {
    const completed = [...(posted ?? []), ...(assigned ?? [])].filter((j) => j.status === 'completed');
    const unique = Array.from(new Map(completed.map((j) => [j.id, j])).values());
    const counts = new Map<string, number>();
    for (const j of unique) counts.set(j.category, (counts.get(j.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [posted, assigned]);

  if (isLoading) return <PageSpinner />;
  if (!profile) return <p className="px-6 py-10 text-center text-text-muted">Profile not found.</p>;

  const bestCategory = profile.top_category ? JOB_CATEGORIES.find((c) => c.slug === profile.top_category) : undefined;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <ProfileHeader profile={profile} isOwn={user?.id === profile.id} />
      <div className="mt-8">
        <ProfileStats profile={profile} />
      </div>

      {bestCategory && (
        <div className="mt-6 flex items-center gap-2.5 rounded-lg border border-border bg-primary-soft/40 px-4 py-3">
          <Sparkles size={18} className="shrink-0 text-primary" />
          <p className="text-sm text-text">
            <span className="font-medium">Best at {bestCategory.label}</span>
            <span className="text-text-muted"> — from what {profile.username ? `@${profile.username}` : 'they'}’ve done on SideQuest</span>
          </p>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg text-text">Track record</h2>
          <div className="mt-3 flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {history.map(([slug, count]) => {
              const cat = JOB_CATEGORIES.find((c) => c.slug === slug);
              return (
                <div key={slug} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="flex items-center gap-2 text-text">
                    <CategoryIcon name={cat?.icon ?? 'MoreHorizontal'} size={15} className="text-text-muted" />
                    {cat?.label ?? slug}
                  </span>
                  <span className="text-text-muted">
                    {count} job{count === 1 ? '' : 's'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg text-text">
          Reviews {reviews && reviews.length > 0 && <span className="text-text-muted">({reviews.length})</span>}
        </h2>
        {reviews && reviews.length > 0 ? (
          <Card className="mt-3 px-5">
            {reviews.map((review) => (
              <ReviewRow key={review.id} review={review} />
            ))}
          </Card>
        ) : (
          <p className="mt-3 text-sm text-text-muted">No reviews yet.</p>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ review }: { review: Review }) {
  const { data: reviewer } = useProfile(review.reviewer_id);
  return <ReviewCard review={review} reviewer={reviewer} />;
}
