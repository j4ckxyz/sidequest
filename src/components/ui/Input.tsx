import { forwardRef, type InputHTMLAttributes } from 'react';
import { cx } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ error, className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cx(
        'h-11 w-full rounded-lg border bg-surface px-3.5 text-[15px] text-text placeholder:text-text-muted transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
        error ? 'border-danger' : 'border-border',
        className,
      )}
      aria-invalid={!!error}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-sm text-danger">{message}</p>;
}

export function Label({ children, htmlFor, hint }: { children: React.ReactNode; htmlFor?: string; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between">
      <label htmlFor={htmlFor} className="text-sm font-medium text-text">
        {children}
      </label>
      {hint && <span className="text-xs text-text-muted">{hint}</span>}
    </div>
  );
}
