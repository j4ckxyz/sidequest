import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '../../lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ error, className, children, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cx(
          'h-11 w-full appearance-none rounded-lg border bg-surface px-3.5 pr-9 text-[15px] text-text transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
          error ? 'border-danger' : 'border-border',
          className,
        )}
        aria-invalid={!!error}
        {...props}
      >
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
    </div>
  );
});
Select.displayName = 'Select';
