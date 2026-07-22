import type { ReactNode } from 'react';
import { cx } from '../../lib/utils';

type Tone = 'neutral' | 'sea' | 'success' | 'warning' | 'danger' | 'primary';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-text-muted',
  sea: 'bg-sea-soft text-sea',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  primary: 'bg-primary-soft text-primary',
};

export function Badge({ tone = 'neutral', children, icon }: { tone?: Tone; children: ReactNode; icon?: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', toneClasses[tone])}>
      {icon}
      {children}
    </span>
  );
}
