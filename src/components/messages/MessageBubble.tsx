import type { Message } from '../../types/models';
import { cx } from '../../lib/utils';
import { formatRelativeTime } from '../../lib/utils';

export function MessageBubble({
  message,
  isOwn,
  startsGroup = true,
  showTime = true,
}: {
  message: Message;
  isOwn: boolean;
  startsGroup?: boolean;
  showTime?: boolean;
}) {
  return (
    <div className={cx('flex flex-col', isOwn ? 'items-end' : 'items-start', startsGroup && 'mt-3 first:mt-0')}>
      <div
        className={cx(
          'max-w-[75%] whitespace-pre-wrap break-words px-4 py-2.5 text-sm leading-snug',
          // Tighter corners inside a cluster; rounded ends on the group's edges.
          isOwn ? 'bg-primary text-on-primary' : 'bg-surface-2 text-text',
          isOwn
            ? cx('rounded-l-2xl', startsGroup ? 'rounded-tr-2xl' : 'rounded-tr-md', showTime ? 'rounded-br-md' : 'rounded-br-md')
            : cx('rounded-r-2xl', startsGroup ? 'rounded-tl-2xl' : 'rounded-tl-md', showTime ? 'rounded-bl-md' : 'rounded-bl-md'),
        )}
      >
        {message.body}
      </div>
      {showTime && <span className="mt-1 px-1 text-xs text-text-muted">{formatRelativeTime(message.created_at)}</span>}
    </div>
  );
}
