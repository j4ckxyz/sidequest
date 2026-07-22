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

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Profile> }) => db.profiles.update(id, patch),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile', data.id] });
    },
  });
}
