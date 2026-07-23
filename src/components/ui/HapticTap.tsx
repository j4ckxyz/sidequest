import { cx } from '../../lib/utils';

/**
 * iOS haptic hack. WebKit fires a native haptic tick when a real finger taps an
 * `<input type="checkbox" switch>`. Synthetic `.click()` no longer triggers it
 * (iOS 26.5), so we lay a real, invisible switch over the control and let it
 * receive the tap directly, then forward the action to the underlying element.
 *
 * The overlay only captures taps on touch devices — on hover/pointer devices it
 * stays inert (pointer-events:none via `.haptic-overlay`) so desktop hover and
 * clicks reach the button normally. Android gets its buzz from the forwarded
 * element's own navigator.vibrate; iOS gets the native switch tick.
 *
 * `switch` isn't a known JSX attribute, so it's set via a ref.
 */
export function HapticTap({ onTap, radius = 10, className }: { onTap: () => void; radius?: number; className?: string }) {
  return (
    <input
      type="checkbox"
      tabIndex={-1}
      aria-hidden="true"
      ref={(el) => el?.setAttribute('switch', '')}
      onChange={onTap}
      className={cx('haptic-overlay absolute inset-0 z-[1] m-0 h-full w-full cursor-pointer opacity-0', className)}
      style={{ clipPath: `inset(0 round ${radius}px)`, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
    />
  );
}
