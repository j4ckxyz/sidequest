import { forwardRef, useRef, type ButtonHTMLAttributes, type MutableRefObject } from 'react';
import { Loader2 } from 'lucide-react';
import { cx } from '../../lib/utils';
import { haptic } from '../../lib/haptics';
import { HapticTap } from './HapticTap';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover disabled:bg-primary/50',
  secondary: 'bg-surface border border-border text-text hover:bg-surface-2 disabled:opacity-50',
  ghost: 'text-text hover:bg-surface-2 disabled:opacity-50',
  danger: 'bg-danger text-white hover:opacity-90 disabled:opacity-50',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, disabled, className, children, onClick, ...props }, ref) => {
    const innerRef = useRef<HTMLButtonElement>(null);
    const setRef = (node: HTMLButtonElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as MutableRefObject<HTMLButtonElement | null>).current = node;
    };
    const isDisabled = disabled || isLoading;
    // Keep the wrapper transparent to layout: mirror the button's stretch so
    // w-full / flex-1 buttons still fill their parent.
    const stretch = /\bflex-1\b/.test(className ?? '') ? 'flex-1' : /\bw-full\b/.test(className ?? '') ? 'w-full' : '';

    return (
      <span className={cx('relative inline-flex', stretch || 'align-middle')}>
        <button
          ref={setRef}
          disabled={isDisabled}
          onClick={(event) => {
            haptic(variant === 'primary' || variant === 'danger' ? 'select' : 'tap');
            onClick?.(event);
          }}
          className={cx(
            'inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed',
            variantClasses[variant],
            sizeClasses[size],
            className,
          )}
          {...props}
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />}
          {children}
        </button>
        {!isDisabled && <HapticTap onTap={() => innerRef.current?.click()} />}
      </span>
    );
  },
);
Button.displayName = 'Button';
