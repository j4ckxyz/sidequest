import { Search } from 'lucide-react';
import { JOB_CATEGORIES, PARISHES } from '../../lib/constants';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

export interface JobFilterState {
  search: string;
  category: string;
  parish: string;
  sort: 'newest' | 'date_needed' | 'budget_high';
}

export function JobFilters({ value, onChange }: { value: JobFilterState; onChange: (next: JobFilterState) => void }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <Input
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="Search jobs…"
          className="pl-10"
          aria-label="Search jobs"
        />
      </div>

      <Select
        value={value.category}
        onChange={(e) => onChange({ ...value, category: e.target.value })}
        aria-label="Filter by category"
        className="sm:w-48"
      >
        <option value="">All categories</option>
        {JOB_CATEGORIES.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.label}
          </option>
        ))}
      </Select>

      <Select
        value={value.parish}
        onChange={(e) => onChange({ ...value, parish: e.target.value })}
        aria-label="Filter by parish"
        className="sm:w-44"
      >
        <option value="">All parishes</option>
        {PARISHES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </Select>

      <Select
        value={value.sort}
        onChange={(e) => onChange({ ...value, sort: e.target.value as JobFilterState['sort'] })}
        aria-label="Sort jobs"
        className="sm:w-44"
      >
        <option value="newest">Newest first</option>
        <option value="date_needed">Date needed</option>
        <option value="budget_high">Budget: high to low</option>
      </Select>
    </div>
  );
}
