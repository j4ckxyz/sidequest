import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';

// Prototype: reset the current admin's own account to a blank, un-onboarded state.
export function useResetAccount() {
  return useMutation({ mutationFn: () => db.adminReset.resetOwnAccount() });
}

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

// Permanently delete another account (all content + profile + auth user). Owner-guarded server-side.
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ callerId, targetId }: { callerId: string; targetId: string }) =>
      db.profiles.deleteAccount(callerId, targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiles'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });
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
