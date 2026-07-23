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

interface PersonGroup {
  key: string;
  counterpart: Profile | null;
  rows: ThreadRow[];
  unread: boolean;
  lastAt: string;
}

// One person can have several job threads. Rather than a fresh chat per job,
// group every conversation with the same counterpart under one person, newest
// activity first. A person with a single thread renders flat; more than one
// nests the job threads beneath a shared person header.
function groupByPerson(rows: ThreadRow[]): PersonGroup[] {
  const groups = new Map<string, PersonGroup>();
  for (const row of rows) {
    const key = row.counterpart?.id ?? `unknown:${row.conversation.id}`;
    const at = row.conversation.last_message_at ?? '';
    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
      existing.unread = existing.unread || row.unread;
      if (at > existing.lastAt) existing.lastAt = at;
    } else {
      groups.set(key, { key, counterpart: row.counterpart, rows: [row], unread: row.unread, lastAt: at });
    }
  }
  const list = [...groups.values()];
  for (const group of list) group.rows.sort((a, b) => (b.conversation.last_message_at ?? '').localeCompare(a.conversation.last_message_at ?? ''));
  list.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  return list;
}

export function ThreadList({ rows }: { rows: ThreadRow[] }) {
  const { conversationId } = useParams();
  const groups = groupByPerson(rows);

  return (
    <div className="flex flex-col divide-y divide-border">
      {groups.map((group) =>
        group.rows.length === 1 ? (
          <ThreadItem key={group.key} row={group.rows[0]} activeId={conversationId} showAvatar />
        ) : (
          <div key={group.key} className="px-4 py-3">
            <div className="flex items-center gap-3 pb-1">
              <Avatar name={group.counterpart?.full_name ?? '?'} src={group.counterpart?.avatar_url} size="md" />
              <div className="min-w-0 flex-1">
                <p className={cx('truncate text-sm', group.unread ? 'font-semibold text-text' : 'text-text')}>
                  {group.counterpart?.full_name ?? 'Unknown'}
                </p>
                <p className="text-xs text-text-muted">{group.rows.length} conversations</p>
              </div>
              {group.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
            </div>
            <div className="ml-6 flex flex-col border-l border-border pl-3">
              {group.rows.map((row) => (
                <ThreadItem key={row.conversation.id} row={row} activeId={conversationId} nested />
              ))}
            </div>
          </div>
        ),
      )}
    </div>
  );
}

function ThreadItem({ row, activeId, showAvatar, nested }: { row: ThreadRow; activeId: string | undefined; showAvatar?: boolean; nested?: boolean }) {
  const { conversation, counterpart, job, lastMessage, unread } = row;
  const active = activeId === conversation.id;

  return (
    <Link
      to={`/messages/${conversation.id}`}
      className={cx(
        'flex items-center gap-3 hover:bg-surface-2',
        nested ? 'rounded-lg px-2 py-2' : 'px-4 py-3.5',
        active && (nested ? 'bg-surface-2' : 'bg-surface-2'),
      )}
    >
      {showAvatar && <Avatar name={counterpart?.full_name ?? '?'} src={counterpart?.avatar_url} size="md" />}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          {nested ? (
            <p className={cx('truncate text-sm', unread ? 'font-semibold text-text' : 'text-text-muted')}>{job?.title ?? 'Conversation'}</p>
          ) : (
            <p className={cx('truncate text-sm', unread ? 'font-semibold text-text' : 'text-text')}>{counterpart?.full_name ?? 'Unknown'}</p>
          )}
          <span className="shrink-0 text-xs text-text-muted">{formatRelativeTime(conversation.last_message_at)}</span>
        </div>
        {!nested && job && <p className="truncate text-xs text-text-muted">{job.title}</p>}
        {lastMessage && <p className={cx('truncate text-sm', unread ? 'text-text' : 'text-text-muted')}>{lastMessage.body}</p>}
      </div>
      {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
    </Link>
  );
}
