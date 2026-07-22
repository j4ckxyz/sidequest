import type { HTMLAttributes } from 'react';
import { cx } from '../../lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-2xl border border-border bg-surface', className)} {...props} />;
}
