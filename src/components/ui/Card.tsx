import type { HTMLAttributes } from 'react';
import { cx } from '../../lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-lg border border-border bg-surface', className)} {...props} />;
}
