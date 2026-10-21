import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import type { Job, JobContentPatch } from '../types/models';

export interface JobFilters {
  search?: string;
  category?: string;
  parish?: string;
  status?: string;
}

export function useJobsList(filters: JobFilters) {
  return useQuery({
    queryKey: ['jobs', 'list', filters],
    queryFn: () => db.jobs.list(filters),
  });
}

/**
 * Semantic search over the recs server's gemini-embedding-2 index. Returns
 * ranked open-job ids. Enabled only for real queries; failures (server down,
 * index not built) resolve to [] so the caller falls back to keyword matching.
 */
export function useSemanticJobSearch(query: string, opts?: { parish?: string; category?: string }) {
  const q = query.trim();
  return useQuery({
    queryKey: ['jobs', 'semantic', q, opts?.parish ?? '', opts?.category ?? ''],
    queryFn: () => db.jobs.searchSemantic(q, opts).catch(() => [] as string[]),
    enabled: q.length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: false,
    placeholderData: (prev) => prev,
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ['jobs', 'detail', id],
    queryFn: () => db.jobs.get(id as string),
    enabled: !!id,
  });
}

export function useJobByPublicId(publicId: string | undefined) {
  return useQuery({
    queryKey: ['jobs', 'detail', 'pub', publicId],
    queryFn: () => db.jobs.getByPublicId(publicId as string),
    enabled: !!publicId,
  });
}

export function useJobsByPoster(posterId: string | undefined) {
  return useQuery({
    queryKey: ['jobs', 'byPoster', posterId],
    queryFn: () => db.jobs.listByPoster(posterId as string),
    enabled: !!posterId,
  });
}

export function useJobsAssignedTo(questerId: string | undefined) {
  return useQuery({
    queryKey: ['jobs', 'assignedTo', questerId],
    queryFn: () => db.jobs.listAssignedTo(questerId as string),
    enabled: !!questerId,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<Job, 'id' | 'public_id' | 'created_at' | 'status' | 'assigned_quester_id'>) => db.jobs.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: JobContentPatch }) => db.jobs.update(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

export function useCancelJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => db.jobs.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

// Poster deletes their own post permanently (any status).
export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => db.jobs.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

export function useMarkJobInProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => db.jobs.markInProgress(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

export function useCompleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => db.jobs.complete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });
}
