import type { CSSProperties } from 'react';

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

/** The modifier-key glyph for this platform — ⌘ on Apple, Ctrl elsewhere. */
export function metaKeyLabel(): string {
  if (typeof navigator === 'undefined') return 'Ctrl';
  return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent) ? '⌘' : 'Ctrl';
}

/** Sanitise an id into a valid CSS custom-ident for view-transition-name. */
export function viewName(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '-');
}

/** Canonical, shareable URL for a job: /job/:username/:public_id. The username
 *  segment is cosmetic (JobDetail resolves by public_id and canonicalises it),
 *  so a missing username falls back to a neutral handle. */
export function jobPath(
  job: { public_id: string },
  poster?: { username: string | null } | null,
): string {
  const handle = poster?.username?.trim() || 'user';
  return `/job/${handle}/${job.public_id}`;
}

/** Inline style carrying a view-transition-name (typed loosely — not yet in CSSProperties). */
export function vtStyle(name: string): CSSProperties {
  return { viewTransitionName: name } as CSSProperties;
}

export function formatCurrency(amount: number | null): string {
  if (amount == null) return 'Negotiable';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: amount % 1 === 0 ? 0 : 2 }).format(amount);
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  return new Intl.DateTimeFormat('en-GB', opts).format(new Date(iso));
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
