import type { Profile, Review } from '../../types/models';
import { Avatar } from '../ui/Avatar';
import { StarRating } from '../ui/StarRating';
import { formatDate } from '../../lib/utils';

export function ReviewCard({ review, reviewer }: { review: Review; reviewer?: Profile | null }) {
  return (
    <div className="border-b border-border py-4 last:border-none">
      <div className="flex items-center gap-2.5">
        <Avatar name={reviewer?.full_name ?? 'Someone'} src={reviewer?.avatar_url} size="sm" />
        <div>
          <p className="text-sm text-text">{reviewer?.full_name ?? 'Someone'}</p>
          <p className="text-xs text-text-muted">{formatDate(review.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
        <div className="ml-auto">
          <StarRating value={review.rating} size={13} />
        </div>
      </div>
      {review.comment && <p className="mt-2.5 text-sm text-text-muted">{review.comment}</p>}
    </div>
  );
}
