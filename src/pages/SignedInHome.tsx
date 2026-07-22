import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, ArrowRight, LayoutDashboard, Sparkles, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useJobsList } from '../hooks/useJobs';
import { useProfile } from '../hooks/useProfile';
import { useRecommendations } from '../hooks/useRecommendations';
import { JobCard } from '../components/jobs/JobCard';
import { JobCardSkeleton } from '../components/ui/Skeleton';
import { Input } from '../components/ui/Input';
import { CategoryIcon } from '../components/jobs/CategoryIcon';
import { JOB_CATEGORIES } from '../lib/constants';
import type { Job, JobRecommendation, Profile } from '../types/models';

function PosterFor({ posterId, children }: { posterId: string; children: (p: Profile | null) => React.ReactNode }) {
  const { data } = useProfile(posterId);
  return <>{children(data ?? null)}</>;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function SignedInHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: jobs, isLoading } = useJobsList({ status: 'open' });
  const { data: recommendations } = useRecommendations(user?.id);

  const firstName = user?.full_name.split(' ')[0] ?? 'there';

  // Discovery, low-friction: hide the user's own posts from the "for you" feed, surface
  // their parish first — but still show their own open jobs in their own section.
  const { nearby, elsewhere, ownOpen } = useMemo(() => {
    const all = jobs ?? [];
    const others = all.filter((j) => j.poster_id !== user?.id);
    return {
      nearby: others.filter((j) => j.parish === user?.parish),
      elsewhere: others.filter((j) => j.parish !== user?.parish),
      ownOpen: all.filter((j) => j.poster_id === user?.id),
    };
  }, [jobs, user?.id, user?.parish]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    navigate(search.trim() ? `/jobs?search=${encodeURIComponent(search.trim())}` : '/jobs');
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:py-10">
      {/* Greeting + quick actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl text-text sm:text-3xl">
            {greeting()}, {firstName}
          </h1>
          {user?.parish && <p className="mt-1 text-sm text-text-muted">Here’s what’s new around {user.parish}.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/jobs/new"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary transition hover:bg-primary-hover"
          >
            <Plus size={16} /> Post a job
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-medium text-text transition hover:bg-surface-2"
          >
            <LayoutDashboard size={16} /> Dashboard
          </Link>
        </div>
      </div>

      {/* Prominent search */}
      <form onSubmit={onSearch} className="mt-6 flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="What do you fancy helping with today?"
            className="h-12 pl-11 text-base"
            aria-label="Search jobs"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-medium text-on-primary transition hover:bg-primary-hover"
        >
          <Search size={16} /> Search
        </button>
      </form>

      {/* Category quick-links */}
      <div className="mt-4 flex flex-wrap gap-2">
        {JOB_CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            to={`/jobs?category=${c.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-text transition hover:border-primary/50 hover:text-primary"
          >
            <CategoryIcon name={c.icon} size={14} className="text-primary/70" />
            {c.label}
          </Link>
        ))}
      </div>

      {/* Picked for you — embeddings-backed recommendations (heuristic on mock/dev) */}
      {recommendations && recommendations.length > 0 && <RecommendedSection recs={recommendations} />}

      {/* Nearby jobs */}
      {isLoading ? (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {ownOpen.length > 0 && <JobSection title="Your open jobs" jobs={ownOpen} seeAllTo="/dashboard/posted" />}
          {nearby.length > 0 && (
            <JobSection title={`Fresh near you${user?.parish ? ` — ${user.parish}` : ''}`} jobs={nearby} />
          )}
          {elsewhere.length > 0 && (
            <JobSection title={nearby.length > 0 ? 'More open jobs across the island' : 'Open jobs across the island'} jobs={elsewhere} />
          )}
          {nearby.length === 0 && elsewhere.length === 0 && (
            <div className="mt-10 rounded-lg border border-dashed border-border px-6 py-14 text-center">
              {ownOpen.length > 0 ? (
                <>
                  <p className="text-text">You’re all posted up.</p>
                  <p className="mt-1 text-sm text-text-muted">No open jobs from other islanders right now — check back soon, or browse everything.</p>
                  <Link
                    to="/jobs"
                    className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-5 text-sm font-medium text-text hover:bg-surface-2"
                  >
                    Browse all jobs
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-text">Quiet on the island right now.</p>
                  <p className="mt-1 text-sm text-text-muted">No open jobs yet — why not be the one to post the first?</p>
                  <Link
                    to="/jobs/new"
                    className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-medium text-on-primary hover:bg-primary-hover"
                  >
                    <Plus size={16} /> Post a job
                  </Link>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const RECS_PAGE = 6;

function RecommendedSection({ recs }: { recs: JobRecommendation[] }) {
  const [offset, setOffset] = useState(0);
  // Wrap around the stored pool so "Show others" always fills a full row.
  const page = Array.from({ length: Math.min(RECS_PAGE, recs.length) }, (_, i) => recs[(offset + i) % recs.length]);
  const hasMore = recs.length > RECS_PAGE;

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          <h2 className="text-lg font-semibold text-text">Picked for you</h2>
        </div>
        {hasMore && (
          <button
            type="button"
            onClick={() => setOffset((o) => (o + RECS_PAGE) % recs.length)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text transition hover:bg-surface-2"
          >
            <RefreshCw size={14} /> Show others
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {page.map(({ job, reason }) => (
          <div key={job.id} className="flex flex-col gap-1.5">
            <p className="flex items-center gap-1.5 px-0.5 text-xs text-text-muted">
              <Sparkles size={12} className="shrink-0 text-primary/70" />
              <span className="line-clamp-1">{reason}</span>
            </p>
            <PosterFor posterId={job.poster_id}>{(poster) => <JobCard job={job} poster={poster} />}</PosterFor>
          </div>
        ))}
      </div>
    </section>
  );
}

function JobSection({ title, jobs, seeAllTo = '/jobs' }: { title: string; jobs: Job[]; seeAllTo?: string }) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        <Link to={seeAllTo} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          See all <ArrowRight size={15} />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {jobs.slice(0, 6).map((job) => (
          <PosterFor key={job.id} posterId={job.poster_id}>
            {(poster) => <JobCard job={job} poster={poster} />}
          </PosterFor>
        ))}
      </div>
    </section>
  );
}
