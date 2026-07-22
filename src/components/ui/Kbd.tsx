import type { ReactNode } from 'react';

/** A single keycap for surfacing keyboard shortcuts inline. Muted by design —
 *  a hint, not a call to action. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium leading-none text-text-muted">
      {children}
    </kbd>
  );
}
