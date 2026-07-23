// Tiny haptics helper. Uses the Vibration API (Android / Chrome). iOS Safari
// doesn't expose it, so it's a graceful no-op there — calls stay cheap and safe
// to sprinkle across taps. Keep patterns short so interaction feels crisp, not buzzy.

type Feel = 'tap' | 'select' | 'success' | 'warn' | 'error';

const PATTERNS: Record<Feel, number | number[]> = {
  tap: 8, // light tick — nav taps, card taps, button presses
  select: 12, // toggles, filter changes
  success: [10, 40, 16], // confirmations (posted, sent, hired)
  warn: [16, 60, 16],
  error: [24, 40, 24, 40, 24],
};

let enabled = true;
export function setHapticsEnabled(on: boolean): void {
  enabled = on;
}

/** Fire a short haptic. Safe to call anywhere; no-ops where unsupported. */
export function haptic(feel: Feel = 'tap'): void {
  if (!enabled) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  // Respect users who ask for reduced motion — treat it as "calm, no buzz".
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  try {
    navigator.vibrate(PATTERNS[feel]);
  } catch {
    // ignore — some browsers gate vibrate behind a user gesture / engagement
  }
}
