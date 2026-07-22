import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useJobsList } from '../hooks/useJobs';
import { useProfile } from '../hooks/useProfile';
import { JobCard } from '../components/jobs/JobCard';
import { JobCardSkeleton } from '../components/ui/Skeleton';
import { JobFilters, type JobFilterState } from '../components/jobs/JobFilters';
import { EmptyState } from '../components/ui/EmptyState';
import type { Profile } from '../types/models';

function PosterFor({ posterId, children }: { posterId: string; children: (p: Profile | null) => React.ReactNode }) {
  const { data } = useProfile(posterId);
  return <>{children(data ?? null)}</>;
}

export function BrowseJobs() {
  const [filters, setFilters] = useState<JobFilterState>({ search: '', category: '', parish: '', sort: 'newest' });
  const { data: jobs, isLoading } = useJobsList({ search: filters.search, category: filters.category, parish: filters.parish });

  const sorted = useMemo(() => {
    if (!jobs) return [];
    const copy = [...jobs];
    if (filters.sort === 'date_needed') copy.sort((a, b) => a.date_needed.localeCompare(b.date_needed));
    if (filters.sort === 'budget_high') copy.sort((a, b) => (b.budget_amount ?? 0) - (a.budget_amount ?? 0));
    return copy;
  }, [jobs, filters.sort]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-2xl text-text">Browse jobs</h1>
      <p className="mt-1 text-sm text-text-muted">Every open side quest across the island, right now.</p>

      <div className="mt-6">
        <JobFilters value={filters} onChange={setFilters} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}
