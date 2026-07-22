import { Loader2 } from 'lucide-react';
import { cx } from '../../lib/utils';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx('animate-spin text-text-muted', className)} size={20} />;
}

export function PageSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
