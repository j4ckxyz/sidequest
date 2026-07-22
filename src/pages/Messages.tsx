import { Outlet, useParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useConversationsEnriched } from '../hooks/useMessages';
import { ThreadList } from '../components/messages/ThreadList';
import { EmptyState } from '../components/ui/EmptyState';
import { PageSpinner } from '../components/ui/Spinner';
import { cx } from '../lib/utils';

export function Messages() {
  const { user } = useAuth();
  const { conversationId } = useParams();
  const { data: rows, isLoading } = useConversationsEnriched(user?.id);

  return (
    <div className="mx-auto flex h-[calc(100vh-9.5rem)] max-w-5xl sm:h-[calc(100vh-7rem)]">
      <aside className={cx('w-full shrink-0 overflow-y-auto border-border sm:w-80 sm:border-r', conversationId && 'hidden sm:block')}>
        <div className="border-b border-border px-4 py-4">
          <h1 className="text-2xl text-text">Messages</h1>
        </div>
        {isLoading && <PageSpinner />}
        {!isLoading && rows && rows.length === 0 && (
          <div className="px-4 py-8">
            <EmptyState icon={<MessageCircle size={24} />} title="No conversations yet" description="Apply to a job or hire someone to start chatting." />
          </div>
        )}
        {!isLoading && rows && rows.length > 0 && <ThreadList rows={rows} />}
      </aside>
      <section className={cx('min-w-0 flex-1', !conversationId && 'hidden sm:flex')}>
        <Outlet />
      </section>
    </div>
  );
}
