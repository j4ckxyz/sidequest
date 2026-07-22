import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { JOB_CATEGORIES, PARISHES } from '../../lib/constants';

export interface JobFilterState {
  search: string;
  category: string;
  parish: string;
  sort: 'newest' | 'date_needed' | 'budget_high';
}

/**
 * Compact filter row — category / parish / sort. Search lives in the floating
 * search surface (Browse jobs), so this component is selects-only and sized to
 * sit on the frosted glass panel rather than in a full-width page row.
 */
export function JobFilters({ value, onChange }: { value: JobFilterState; onChange: (next: JobFilterState) => void }) {
  return (
    <div className="flex items-center gap-2">
      <FilterField
        value={value.category}
        onChange={(v) => onChange({ ...value, category: v })}
        aria-label="Filter by category"
      >
        <option value="">Category</option>
        {JOB_CATEGORIES.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.label}
          </option>
        ))}
      </FilterField>

      <FilterField value={value.parish} onChange={(v) => onChange({ ...value, parish: v })} aria-label="Filter by parish">
        <option value="">Parish</option>
        {PARISHES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </FilterField>

      <FilterField
        value={value.sort}
        onChange={(v) => onChange({ ...value, sort: v as JobFilterState['sort'] })}
        aria-label="Sort jobs"
      >
        <option value="newest">Newest</option>
        <option value="date_needed">Date needed</option>
        <option value="budget_high">Budget</option>
      </FilterField>
    </div>
  );
}

function FilterField({
  value,
  onChange,
  children,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  'aria-label': string;
}) {
  const active = value !== '' && value !== 'newest';
  return (
    <div className="relative min-w-0 flex-1 sm:w-32 sm:flex-none">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-10 w-full appearance-none truncate rounded-lg border bg-surface/80 pl-3 pr-8 text-base transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:h-9 sm:text-sm ${
          active ? 'border-primary/50 text-text' : 'border-border/70 text-text-muted'
        }`}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
    </div>
  );
}
