import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useJobsList, useSemanticJobSearch } from '../hooks/useJobs';
import { useProfile } from '../hooks/useProfile';
import { JobCard } from '../components/jobs/JobCard';
import { JobCardSkeleton } from '../components/ui/Skeleton';
import { JobFilters, type JobFilterState } from '../components/jobs/JobFilters';
import { EmptyState } from '../components/ui/EmptyState';
import { Kbd } from '../components/ui/Kbd';
import { JOB_CATEGORIES } from '../lib/constants';
import type { Job, Profile } from '../types/models';

function PosterFor({ posterId, children }: { posterId: string; children: (p: Profile | null) => React.ReactNode }) {
  const { data } = useProfile(posterId);
  return <>{children(data ?? null)}</>;
}

export function BrowseJobs() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<JobFilterState>({
    search: searchParams.get('search') ?? '',
    category: searchParams.get('category') ?? '',
    parish: searchParams.get('parish') ?? '',
    sort: 'newest',
  });
  const searchRef = useRef<HTMLInputElement>(null);
  const query = filters.search.trim();
  // Fetch the full open set for the current category/parish (no server-side text
  // filter) so semantic + keyword results can be merged client-side and shown
  // instantly. The semantic ids stream in from the recs server a beat later.
  const { data: jobs, isLoading } = useJobsList({ category: filters.category, parish: filters.parish, status: 'open' });
  const { data: semanticIds } = useSemanticJobSearch(query, { parish: filters.parish, category: filters.category });

  // Press "/" anywhere to jump into the floating search bar; Esc to leave it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing =
        !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        searchRef.current?.blur();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const sorted = useMemo(() => {
    if (!jobs) return [];

    // No query → the full open set, respecting the chosen sort.
    if (!query) {
      const copy = [...jobs];
      // Flexible/undated jobs sort to the end.
      if (filters.sort === 'date_needed') copy.sort((a, b) => (a.date_needed ?? '9999').localeCompare(b.date_needed ?? '9999'));
      if (filters.sort === 'budget_high') copy.sort((a, b) => (b.budget_amount ?? 0) - (a.budget_amount ?? 0));
      return copy;
    }

    // Query → relevance order: semantic matches first (e.g. "laptop" → Computer
    // jobs), then literal keyword/category matches not already surfaced.
    const q = query.toLowerCase();
    const catSlugs = JOB_CATEGORIES.filter(
      (c) => c.label.toLowerCase().includes(q) || c.slug.replace(/-/g, ' ').includes(q),
    ).map((c) => c.slug);
    const keywordMatch = (j: Job) =>
      j.title.toLowerCase().includes(q) ||
      j.description.toLowerCase().includes(q) ||
      catSlugs.includes(j.category) ||
      j.category.replace(/-/g, ' ').includes(q);

    const byId = new Map(jobs.map((j) => [j.id, j]));
    const ordered: Job[] = [];
    const seen = new Set<string>();
    for (const id of semanticIds ?? []) {
      const job = byId.get(id);
      if (job && !seen.has(id)) {
        ordered.push(job);
        seen.add(id);
      }
    }
    for (const job of jobs) {
      if (!seen.has(job.id) && keywordMatch(job)) {
        ordered.push(job);
        seen.add(job.id);
      }
    }
    return ordered;
  }, [jobs, query, semanticIds, filters.sort]);

  return (
    <div className="mx-auto max-w-6xl px-6 pt-10 pb-44 sm:pb-32">
      <h1 className="text-2xl text-text">Browse jobs</h1>
      <p className="mt-1 text-sm text-text-muted">
        {isLoading
          ? 'Loading jobs…'
          : `${sorted.length} ${sorted.length === 1 ? 'job' : 'jobs'} across the island right now`}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}
        {!isLoading &&
          sorted.map((job) => (
            <PosterFor key={job.id} posterId={job.poster_id}>
              {(poster) => <JobCard job={job} poster={poster} />}
            </PosterFor>
          ))}
      </div>

      {!isLoading && sorted.length === 0 && (
        <div className="mt-6">
          <EmptyState icon={<Search size={28} />} title="No jobs match those filters" description="Try widening your search, or check back soon — new jobs go up all the time." />
        </div>
      )}

      {/* Always-visible floating search + filter panel.
          Mobile: a thumb-reach pill above the bottom nav — search stacked over filters.
          Desktop: a wide single-row search toolbar (deliberately not a compact
          bottom-centre bubble, which would read as a chat widget). */}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center px-4 sm:bottom-6">
        <div className="glass animate-rise-in pointer-events-auto flex w-full max-w-xl flex-col gap-2 rounded-2xl border border-border/60 p-2 shadow-float transition-colors focus-within:border-primary/40 sm:max-w-3xl sm:flex-row sm:items-center sm:gap-3 sm:rounded-xl sm:pl-4">
          <div className="flex items-center gap-2 pl-2 sm:min-w-0 sm:flex-1 sm:pl-0">
            <Search size={18} className="shrink-0 text-text-muted" />
            <input
              ref={searchRef}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search jobs — lawn mowing, shopping runs, moving help…"
              aria-label="Search jobs"
              className="w-full bg-transparent text-base text-text placeholder:text-text-muted outline-none"
            />
            {filters.search ? (
              <button
                onClick={() => {
                  setFilters({ ...filters, search: '' });
                  searchRef.current?.focus();
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface-2 hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            ) : (
              <span className="mr-1 hidden shrink-0 sm:block" title="Press / to search">
                <Kbd>/</Kbd>
              </span>
            )}
          </div>

          <div className="border-t border-border/50 pt-2 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
            <JobFilters value={filters} onChange={setFilters} />
          </div>
        </div>
      </div>
    </div>
  );
}
