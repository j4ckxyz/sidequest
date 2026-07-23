import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reporter_id: string; target_type: 'job' | 'user'; target_id: string; reason: string }) =>
      db.moderation.createReport(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moderation'] }),
  });
}

// Whether the current user has already reported this target (and its review status),
// so the UI can prevent a duplicate report.
export function useMyReport(reporterId: string | undefined, targetType: 'job' | 'user', targetId: string | undefined) {
  return useQuery({
    queryKey: ['moderation', 'myReport', reporterId, targetType, targetId],
    queryFn: () => db.moderation.myReportForTarget(reporterId as string, targetType, targetId as string),
    enabled: !!reporterId && !!targetId,
    staleTime: 30_000,
  });
}

export function useReports(callerId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['moderation', 'reports', callerId],
    queryFn: () => db.moderation.listReports(callerId as string),
    enabled: !!callerId && enabled,
    refetchInterval: 3000,
  });
}

export function useModerationEvents(callerId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['moderation', 'events', callerId],
    queryFn: () => db.moderation.listEvents(callerId as string),
    enabled: !!callerId && enabled,
    refetchInterval: 1500,
  });
}

export function useModerationActions(callerId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['moderation', 'actions', callerId],
    queryFn: () => db.moderation.listActions(callerId as string),
    enabled: !!callerId && enabled,
    refetchInterval: 3000,
  });
}

export function useAdminBan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ callerId, targetId, days, reason }: { callerId: string; targetId: string; days: number; reason: string }) =>
      db.moderation.adminBan(callerId, targetId, days, reason),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useAdminSuspend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ callerId, targetId, reason }: { callerId: string; targetId: string; reason: string }) =>
      db.moderation.adminSuspend(callerId, targetId, reason),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useAdminUnban() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ callerId, targetId }: { callerId: string; targetId: string }) => db.moderation.adminUnban(callerId, targetId),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
