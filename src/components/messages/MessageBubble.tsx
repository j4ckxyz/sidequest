import type { Message } from '../../types/models';
import { cx } from '../../lib/utils';
import { formatRelativeTime } from '../../lib/utils';

export function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  return (
    <div className={cx('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
      <div
        className={cx(
          'max-w-[75%] rounded-lg px-4 py-2.5 text-sm leading-snug',
          isOwn ? 'rounded-br-sm bg-primary text-on-primary' : 'rounded-bl-sm bg-surface-2 text-text',
        )}
      >
        {message.body}
      </div>
      <span className="mt-1 px-1 text-xs text-text-muted">{formatRelativeTime(message.created_at)}</span>
    </div>
  );
}
