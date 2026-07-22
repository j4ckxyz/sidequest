import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';

export function useAllProfiles(callerId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'profiles', callerId],
    queryFn: () => db.profiles.listAll(callerId as string),
    enabled: !!callerId,
  });
}

export function useAllJobsAdmin(callerId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'jobs', callerId],
    queryFn: () => db.jobs.listAllAdmin(callerId as string),
    enabled: !!callerId,
  });
}

export function useSetAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ callerId, targetId, isAdmin }: { callerId: string; targetId: string; isAdmin: boolean }) =>
      db.profiles.setAdmin(callerId, targetId, isAdmin),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profile', data.id] });
    },
  });
}

export function useAdminDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ callerId, jobId }: { callerId: string; jobId: string }) => db.jobs.adminDelete(callerId, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}
