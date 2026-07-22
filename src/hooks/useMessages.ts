import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';

export function useConversations(userId: string | undefined) {
  return useQuery({
    queryKey: ['conversations', 'forUser', userId],
    queryFn: () => db.conversations.listForUser(userId as string),
    enabled: !!userId,
    refetchInterval: 4000,
  });
}

export function useConversationsEnriched(userId: string | undefined) {
  return useQuery({
    queryKey: ['conversations', 'enriched', userId],
    queryFn: () => db.conversations.listForUserEnriched(userId as string),
    enabled: !!userId,
    refetchInterval: 4000,
  });
}

export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: ['conversations', 'detail', id],
    queryFn: () => db.conversations.get(id as string),
    enabled: !!id,
  });
}

export function useMessagesInConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => db.messages.listByConversation(conversationId as string),
    enabled: !!conversationId,
    refetchInterval: 3000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, senderId, body }: { conversationId: string; senderId: string; body: string }) =>
      db.messages.send(conversationId, senderId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, readerId }: { conversationId: string; readerId: string }) => db.messages.markRead(conversationId, readerId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useGetOrCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, posterId, questerId }: { jobId: string; posterId: string; questerId: string }) =>
      db.conversations.getOrCreateForJob(jobId, posterId, questerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

export function useUnreadCount(userId: string | undefined) {
  const { data } = useQuery({
    queryKey: ['messages', 'unreadCount', userId],
    queryFn: () => db.messages.unreadCountForUser(userId as string),
    enabled: !!userId,
    refetchInterval: 3000,
  });
  return data ?? 0;
}
