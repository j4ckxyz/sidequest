import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Archive, ChevronDown } from 'lucide-react';
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

// A conversation whose job is finished/cancelled is archived out of the main list.
function isArchived(row: ThreadRow): boolean {
  return row.job?.status === 'completed' || row.job?.status === 'cancelled';
}

// Group every conversation with the same counterpart under one person, newest first.
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
  for (const group of list) {
    group.rows.sort((a, b) => (b.conversation.last_message_at ?? '').localeCompare(a.conversation.last_message_at ?? ''));
  }
  list.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  return list;
}

export function ThreadList({ rows, userId }: { rows: ThreadRow[]; userId?: string }) {
  const { conversationId } = useParams();
  const activeGroups = groupByPerson(rows.filter((row) => !isArchived(row)));
  const archivedGroups = groupByPerson(rows.filter(isArchived));
  const archivedCount = archivedGroups.reduce((n, g) => n + g.rows.length, 0);

  return (
    <div className="flex flex-col">
      <div className="divide-y divide-border">
        {activeGroups.map((group) => (
          <PersonGroup key={group.key} group={group} userId={userId} activeId={conversationId} />
        ))}
      </div>
      {archivedCount > 0 && <ArchivedSection groups={archivedGroups} count={archivedCount} userId={userId} activeId={conversationId} />}
    </div>
  );
}

// One person: header + their latest conversation, with older ones tucked behind a toggle.
function PersonGroup({ group, userId, activeId }: { group: PersonGroup; userId?: string; activeId?: string }) {
  const [showOlder, setShowOlder] = useState(false);
  const [latest, ...older] = group.rows;

  return (
    <div className="px-2 py-2">
      <div className="flex items-center gap-3 px-2 py-1.5">
        <Avatar name={group.counterpart?.full_name ?? '?'} src={group.counterpart?.avatar_url} size="md" />
        <div className="min-w-0 flex-1">
          <p className={cx('truncate text-sm', group.unread ? 'font-semibold text-text' : 'text-text')}>
            {group.counterpart?.full_name ?? 'Unknown'}
          </p>
          {group.rows.length > 1 && <p className="text-xs text-text-muted">{group.rows.length} conversations</p>}
        </div>
        {group.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
      </div>

      <div className="flex flex-col gap-0.5 pl-1">
        <ConversationRow row={latest} userId={userId} activeId={activeId} />
        {showOlder && older.map((row) => <ConversationRow key={row.conversation.id} row={row} userId={userId} activeId={activeId} />)}
        {older.length > 0 && (
          <button
            type="button"
            onClick={() => setShowOlder((v) => !v)}
            className="mt-0.5 self-start rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-surface-2"
          >
            {showOlder ? 'Hide older' : `Show ${older.length} older`}
          </button>
        )}
      </div>
    </div>
  );
}

function ArchivedSection({ groups, count, userId, activeId }: { groups: PersonGroup[]; count: number; userId?: string; activeId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm text-text-muted hover:bg-surface-2"
      >
        <span className="flex items-center gap-2">
          <Archive size={14} /> Archived ({count})
        </span>
        <ChevronDown size={16} className={cx('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="divide-y divide-border opacity-80">
          {groups.map((group) => (
            <PersonGroup key={group.key} group={group} userId={userId} activeId={activeId} />
          ))}
        </div>
      )}
    </div>
  );
}

function ConversationRow({ row, userId, activeId }: { row: ThreadRow; userId?: string; activeId?: string }) {
  const { conversation, job, lastMessage, unread } = row;
  const active = activeId === conversation.id;
  const hosting = !!userId && conversation.poster_id === userId;

  return (
    <Link
      to={`/messages/${conversation.id}`}
      className={cx('flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-surface-2', active && 'bg-surface-2')}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={cx('truncate text-sm', unread ? 'font-semibold text-text' : 'text-text-muted')}>{job?.title ?? 'Conversation'}</p>
          <span className="shrink-0 text-xs text-text-muted">{formatRelativeTime(conversation.last_message_at)}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <RoleBadge hosting={hosting} />
          {lastMessage && <p className={cx('min-w-0 flex-1 truncate text-sm', unread ? 'text-text' : 'text-text-muted')}>{lastMessage.body}</p>}
        </div>
      </div>
      {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
    </Link>
  );
}

// Makes it obvious whether this chat is a job you posted (hosting) or someone
// else's job you applied to (applied).
function RoleBadge({ hosting }: { hosting: boolean }) {
  return (
    <span
      className={cx(
        'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        hosting ? 'bg-sage-soft text-sage' : 'bg-primary-soft text-primary',
      )}
    >
      {hosting ? 'Hosting' : 'Applied'}
    </span>
  );
}
