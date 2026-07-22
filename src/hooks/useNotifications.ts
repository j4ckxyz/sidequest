import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', 'list', userId],
    queryFn: () => db.notifications.listForUser(userId as string),
    enabled: !!userId,
    refetchInterval: 5000,
  });
}

export function useUnreadNotificationCount(userId: string | undefined) {
  const { data } = useQuery({
    queryKey: ['notifications', 'unreadCount', userId],
    queryFn: () => db.notifications.unreadCount(userId as string),
    enabled: !!userId,
    refetchInterval: 5000,
  });
  return data ?? 0;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => db.notifications.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => db.notifications.markAllRead(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
