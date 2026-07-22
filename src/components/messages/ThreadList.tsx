import { Link, useParams } from 'react-router-dom';
import type { Conversation, Job, Message, Profile } from '../../types/models';
import { Avatar } from '../ui/Avatar';
import { formatRelativeTime, cx } from '../../lib/utils';

export interface ThreadRow {
  conversation: Conversation;
  counterpart: Profile | null;
  job: Job | null;
  lastMessage: Message | null;
  unread: boolean;
}

export function ThreadList({ rows }: { rows: ThreadRow[] }) {
  const { conversationId } = useParams();

  return (
    <div className="flex flex-col divide-y divide-border">
      {rows.map(({ conversation, counterpart, job, lastMessage, unread }) => (
        <Link
          key={conversation.id}
          to={`/messages/${conversation.id}`}
          className={cx(
            'flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2',
            conversationId === conversation.id && 'bg-surface-2',
          )}
        >
          <Avatar name={counterpart?.full_name ?? '?'} src={counterpart?.avatar_url} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className={cx('truncate text-sm', unread ? 'font-semibold text-text' : 'text-text')}>{counterpart?.full_name ?? 'Unknown'}</p>
              <span className="shrink-0 text-xs text-text-muted">{formatRelativeTime(conversation.last_message_at)}</span>
            </div>
            {job && <p className="truncate text-xs text-text-muted">{job.title}</p>}
            {lastMessage && <p className={cx('truncate text-sm', unread ? 'text-text' : 'text-text-muted')}>{lastMessage.body}</p>}
          </div>
          {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
        </Link>
      ))}
    </div>
  );
}
