import { Link } from 'react-router-dom';
import { ArrowRight, Star, MapPin, MessagesSquare } from 'lucide-react';
import { JOB_CATEGORIES, PARISHES } from '../lib/constants';
import { CategoryIcon } from '../components/jobs/CategoryIcon';

const STEPS = [
  {
    n: '01',
    title: 'Post your job',
    body: 'Tell the island what needs doing and what you’ll pay. Two minutes, no faff.',
  },
  {
    n: '02',
    title: 'Locals offer to help',
    body: 'Neighbours nearby put their hand up. Read their reviews, pick whoever feels right.',
  },
  {
    n: '03',
    title: 'Job done, both happy',
    body: 'They sort it, you both leave a review — and the island gets a little kinder.',
  },
];

const TRUST = [
  {
    icon: Star,
    title: 'Real island reviews',
    body: 'Every helper builds a reputation job by job. You see it before you ever say yes.',
  },
  {
    icon: MapPin,
    title: 'Parish by parish',
    body: 'Jobs and helpers are local by design — your neighbours, not a faceless agency.',
  },
  {
    icon: MessagesSquare,
    title: 'You’re in control',
    body: 'Have a chat before you commit, agree the price up front, choose who lends a hand.',
  },
];

export function LandingPage() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-14 sm:pt-20">
        <p className="sq-rise sq-rise-1 text-sm font-medium uppercase tracking-[0.18em] text-primary">
          Bouônjour — Jersey’s neighbourly job board
        </p>
        <h1 className="sq-rise sq-rise-2 mt-5 max-w-3xl font-display text-[clamp(2.75rem,6vw+0.5rem,5rem)] leading-[1.02] tracking-[-0.015em] text-text">
          Short jobs, done by <span className="sq-underline text-primary">your neighbours</span>.
        </h1>
        <p className="sq-rise sq-rise-3 mt-6 max-w-xl text-lg leading-relaxed text-text-muted">
          A Trinity hedge that wants a trim, a shop run into town, a flat-pack that won’t behave. Post your side quest and a
          local lends a hand — every job’s a day or two, every helper’s from the island.
        </p>
        <div className="sq-rise sq-rise-3 mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/signup"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-base font-medium text-on-primary shadow-sm transition hover:bg-primary-hover"
          >
            Sign up — it’s free <ArrowRight size={18} />
          </Link>
          <Link
            to="/login"
            className="inline-flex h-12 items-center rounded-lg border border-border px-6 text-base font-medium text-text transition hover:bg-surface-2"
          >
            Log in
          </Link>
        </div>
        <p className="sq-rise sq-rise-4 mt-5 text-sm text-text-muted">
          Free to post · All twelve parishes · Islanders helping islanders
        </p>
      </section>

      {/* Parish rail — the signature. Twelve real places, the island's own structure. */}
      <section aria-labelledby="parishes-heading" className="border-y border-border bg-surface-2/50">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <h2 id="parishes-heading" className="text-sm font-medium uppercase tracking-[0.18em] text-text-muted">
            Wherever you are on the island
          </h2>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {PARISHES.map((parish) => (
              <Link
                key={parish}
                to={`/jobs?parish=${encodeURIComponent(parish)}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-text transition hover:border-primary/50 hover:text-primary"
              >
                <MapPin size={13} className="text-primary/70" />
                {parish}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — a genuine sequence, so the numbers earn their place. */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <h2 className="font-display text-3xl text-text sm:text-4xl">How SideQuest works</h2>
        <p className="mt-3 max-w-lg text-text-muted">Three steps from “someone should really do that” to done.</p>
        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.n} className="border-t-2 border-primary/25 pt-5">
              <span className="font-display text-4xl text-primary/40">{step.n}</span>
              <h3 className="mt-2 text-xl font-semibold text-text">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Categories */}
      <section className="border-t border-border bg-surface-2/50">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <h2 className="font-display text-3xl text-text sm:text-4xl">What needs doing?</h2>
          <p className="mt-3 max-w-lg text-text-muted">Whatever it is, there’s a local who’d be glad to help.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {JOB_CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                to={`/jobs?category=${c.slug}`}
                className="group flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3.5 transition hover:border-primary/50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <CategoryIcon name={c.icon} size={18} />
                </span>
                <span className="font-medium text-text group-hover:text-primary">{c.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & safety */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <h2 className="font-display text-3xl text-text sm:text-4xl">Neighbourly, not nameless</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {TRUST.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-sage-soft text-sage">
                <Icon size={20} />
              </span>
              <h3 className="mt-4 text-xl font-semibold text-text">{title}</h3>
              <p className="mt-2 leading-relaxed text-text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-primary-soft/60">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-16 sm:flex-row sm:items-center sm:justify-between sm:py-20">
          <div>
            <h2 className="font-display text-3xl text-text sm:text-4xl">Got a side quest?</h2>
            <p className="mt-3 max-w-md text-text-muted">Give it to a local. Free to post, and someone nearby is probably free this week.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/signup"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-base font-medium text-on-primary transition hover:bg-primary-hover"
            >
              Sign up — it’s free <ArrowRight size={18} />
            </Link>
            <Link
              to="/jobs"
              className="inline-flex h-12 items-center rounded-lg border border-border bg-surface px-6 text-base font-medium text-text transition hover:bg-surface-2"
            >
              Browse jobs first
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <span className="font-display text-base text-text">SideQuest</span>
          <span>Made on the island · À bientôt</span>
        </div>
      </footer>
    </div>
  );
}
