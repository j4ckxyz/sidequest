import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useConversation, useMessagesInConversation, useSendMessage, useMarkConversationRead } from '../hooks/useMessages';
import { useProfile } from '../hooks/useProfile';
import { useJob } from '../hooks/useJobs';
import { ChatThread } from '../components/messages/ChatThread';
import { Avatar } from '../components/ui/Avatar';
import { PageSpinner } from '../components/ui/Spinner';

export function MessagesThreadPage() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: conversation, isLoading: loadingConv } = useConversation(conversationId);
  const counterpartId = conversation && user ? (conversation.poster_id === user.id ? conversation.quester_id : conversation.poster_id) : undefined;
  const { data: counterpart } = useProfile(counterpartId);
  const { data: job } = useJob(conversation?.job_id);
  const { data: messages, isLoading: loadingMessages } = useMessagesInConversation(conversationId);
  const sendMessage = useSendMessage();
  const markRead = useMarkConversationRead();

  useEffect(() => {
    if (conversationId && user) markRead.mutate({ conversationId, readerId: user.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user?.id]);

  if (loadingConv || loadingMessages || !user) return <PageSpinner />;
  if (!conversation) return <p className="p-6 text-text-muted">Conversation not found.</p>;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="glass sticky top-0 z-10 flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={() => navigate('/messages')} className="text-text-muted hover:text-text sm:hidden" aria-label="Back to conversations">
          <ArrowLeft size={20} />
        </button>
        {counterpart && <Avatar name={counterpart.full_name} src={counterpart.avatar_url} size="sm" />}
        <div className="min-w-0">
          <Link to={counterpart ? `/profile/${counterpart.id}` : '#'} className="truncate text-sm font-medium text-text hover:text-primary">
            {counterpart?.full_name ?? 'Unknown'}
          </Link>
          {job && (
            <Link to={`/jobs/${job.id}`} className="block truncate text-xs text-text-muted hover:text-primary">
              {job.title}
            </Link>
          )}
        </div>
      </div>
      <ChatThread
        messages={messages ?? []}
        currentUserId={user.id}
        isSending={sendMessage.isPending}
        onSend={(body) => sendMessage.mutate({ conversationId: conversation.id, senderId: user.id, body })}
      />
    </div>
  );
}
