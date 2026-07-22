import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';

export function useApplicationsByJob(jobId: string | undefined) {
  return useQuery({
    queryKey: ['applications', 'byJob', jobId],
    queryFn: () => db.applications.listByJob(jobId as string),
    enabled: !!jobId,
  });
}

export function useApplicationsByQuester(questerId: string | undefined) {
  return useQuery({
    queryKey: ['applications', 'byQuester', questerId],
    queryFn: () => db.applications.listByQuester(questerId as string),
    enabled: !!questerId,
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { job_id: string; quester_id: string; message: string; proposed_amount: number | null }) => db.applications.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useWithdrawApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => db.applications.withdraw(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['applications'] }),
  });
}

export function useAcceptApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => db.applications.accept(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useRejectApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => db.applications.reject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['applications'] }),
  });
}
