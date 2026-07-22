import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';

export function useRecommendations(userId: string | undefined) {
  return useQuery({
    queryKey: ['recommendations', userId],
    queryFn: () => db.recommendations.listForUser(userId as string),
    enabled: !!userId,
  });
}

/** Admin-triggered refresh of the recommendations service. */
export function useRefreshRecommendations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => db.recommendations.refresh(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recommendations'] }),
  });
}
