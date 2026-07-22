import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cx } from '../../lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ error, className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cx(
        'w-full rounded-lg border bg-surface px-3.5 py-2.5 text-base text-text placeholder:text-text-muted transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
        error ? 'border-danger' : 'border-border',
        className,
      )}
      aria-invalid={!!error}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';
