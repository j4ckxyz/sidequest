import { initials } from '../../lib/utils';
import { cx } from '../../lib/utils';

const sizeMap = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-lg', xl: 'h-24 w-24 text-2xl' };

export function Avatar({ name, src, size = 'md' }: { name: string; src?: string | null; size?: keyof typeof sizeMap }) {
  if (src) {
    return <img src={src} alt={name} className={cx('rounded-full object-cover', sizeMap[size])} />;
  }
  return (
    <div
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full bg-sage-soft font-medium text-sage',
        sizeMap[size],
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
