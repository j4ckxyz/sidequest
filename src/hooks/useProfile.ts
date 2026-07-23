import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import type { Profile } from '../types/models';

export function useProfile(id: string | undefined) {
  return useQuery({
    queryKey: ['profile', id],
    queryFn: () => db.profiles.get(id as string),
    enabled: !!id,
  });
}

/** Batch-fetch many profiles in one request (avoids an N+1 of per-card queries). */
export function useProfiles(ids: string[]) {
  const key = [...new Set(ids)].filter(Boolean).sort();
  return useQuery({
    queryKey: ['profiles', 'many', key],
    queryFn: () => db.profiles.getMany(key),
    enabled: key.length > 0,
    staleTime: 60_000,
  });
}

export function useProfileByUsername(username: string | undefined) {
  return useQuery({
    queryKey: ['profile', 'byUsername', username],
    queryFn: () => db.profiles.getByUsername(username as string),
    enabled: !!username,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Profile> }) => db.profiles.update(id, patch),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile', data.id] });
    },
  });
}
