import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { useProfile } from '../hooks/useProfile';
import { useReviewsFor } from '../hooks/useReviews';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileStats } from '../components/profile/ProfileStats';
import { ReviewCard } from '../components/reviews/ReviewCard';
import { PageSpinner } from '../components/ui/Spinner';
import { Card } from '../components/ui/Card';
import type { Review } from '../types/models';

export function ProfileView() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile(id);
  const { data: reviews } = useReviewsFor(id);

  if (isLoading) return <PageSpinner />;
  if (!profile) return <p className="px-6 py-10 text-center text-text-muted">Profile not found.</p>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <ProfileHeader profile={profile} isOwn={user?.id === profile.id} />
      <div className="mt-8">
        <ProfileStats profile={profile} />
      </div>

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
