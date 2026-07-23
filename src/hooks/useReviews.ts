import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';

export function useReviewsFor(profileId: string | undefined) {
  return useQuery({
    queryKey: ['reviews', 'for', profileId],
    queryFn: () => db.profiles.reviewsFor(profileId as string),
    enabled: !!profileId,
  });
}

export function useHasReviewed(jobId: string | undefined, reviewerId: string | undefined, revieweeId?: string) {
  return useQuery({
    queryKey: ['reviews', 'exists', jobId, reviewerId, revieweeId],
    queryFn: () => db.reviews.existsFor(jobId as string, reviewerId as string, revieweeId),
    enabled: !!jobId && !!reviewerId,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { job_id: string; reviewer_id: string; reviewee_id: string; rating: number; comment: string }) => db.reviews.create(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['profile', variables.reviewee_id] });
    },
  });
}
