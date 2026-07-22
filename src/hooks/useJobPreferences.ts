import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import type { JobPreferenceState } from '../types/models';

const preferenceKey = (userId: string | undefined) => ['job-preferences', userId] as const;

export function useJobPreferences(userId: string | undefined) {
  return useQuery({
    queryKey: preferenceKey(userId),
    queryFn: () => db.preferences.get(),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useUpdateJobPreferences(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { preferredCategories: string[]; hideLocation: boolean }) => db.preferences.update(input),
    onSuccess: (state) => {
      queryClient.setQueryData<JobPreferenceState>(preferenceKey(userId), state);
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });
}

export function useSendJobPreferenceMessage(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => db.preferences.sendMessage(message),
    onSuccess: (state) => {
      queryClient.setQueryData<JobPreferenceState>(preferenceKey(userId), state);
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });
}

