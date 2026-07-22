import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Clock3, Users } from 'lucide-react';
import { useJobsList } from '../hooks/useJobs';
import { useProfile } from '../hooks/useProfile';
import { JobCard } from '../components/jobs/JobCard';
import { JobCardSkeleton } from '../components/ui/Skeleton';
import type { Profile } from '../types/models';

function PosterFor({ posterId, children }: { posterId: string; children: (p: Profile | null) => React.ReactNode }) {
  const { data } = useProfile(posterId);
  return <>{children(data ?? null)}</>;
}

export function Home() {
  const { data: jobs, isLoading } = useJobsList({ status: 'open' });
  const recent = jobs?.slice(0, 6) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-6">
      <section className="flex flex-col gap-8 py-14 sm:flex-row sm:items-center sm:py-20">
        <div className="max-w-xl">
          <h1 className="text-hero font-display text-text">Short jobs, done by your neighbours.</h1>
          <p className="mt-5 max-w-md text-base text-text-muted">
            Lawn needs mowing? Gran needs her shopping done? Post it in two minutes and a local will take it from here — every job is 1–2 days,
            every helper is a Jersey local.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/jobs/new" className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-base font-medium text-on-primary hover:bg-primary-hover">
              Post a job
            </Link>
            <Link to="/jobs" className="inline-flex h-12 items-center gap-1.5 rounded-full px-5 text-base font-medium text-text hover:bg-surface-2">
              Browse jobs <ArrowRight size={16} />
            </Link>
          </div>
          <dl className="mt-10 flex flex-col gap-3 text-sm text-text-muted sm:flex-row sm:gap-8">
            <div className="flex items-center gap-2">
              <Clock3 size={16} className="text-primary" />
              <dt className="sr-only">Speed</dt>
              <dd>Posted in two minutes</dd>
            </div>
            <div className="flex items-center gap-2">
              <Users size={16} className="text-primary" />
              <dt className="sr-only">Locality</dt>
              <dd>All twelve parishes</dd>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary" />
              <dt className="sr-only">Trust</dt>
              <dd>Reviews you can trust</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="pb-20">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-section-title font-display text-text">Open right now</h2>
          <Link to="/jobs" className="text-sm font-medium text-primary hover:underline">
            See all
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)
            : recent.map((job) => (
                <PosterFor key={job.id} posterId={job.poster_id}>
                  {(poster) => <JobCard job={job} poster={poster} />}
                </PosterFor>
              ))}
        </div>
      </section>
    </div>
  );
}
