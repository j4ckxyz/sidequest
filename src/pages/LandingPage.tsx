import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Star,
  MapPin,
  MessagesSquare,
  ListFilter,
  Map as MapIcon,
  Sparkles,
  Download,
  BellRing,
  Compass,
} from 'lucide-react';
import { JOB_CATEGORIES, PARISHES } from '../lib/constants';
import { CategoryIcon } from '../components/jobs/CategoryIcon';
import { cx } from '../lib/utils';

type Feature = { icon: ComponentType<{ size?: number; className?: string }>; text: string };

const DESKTOP_FEATURES: Feature[] = [
  { icon: ListFilter, text: 'Filter by parish and category, or search the second something springs to mind.' },
  { icon: MapIcon, text: 'An interactive island map that pins every job to a real place.' },
  { icon: Star, text: 'Reviews and ratings on every helper, so you know before you say yes.' },
  { icon: Sparkles, text: 'Recommendations that quietly learn what you’re handy with.' },
];

const PHONE_FEATURES: Feature[] = [
  { icon: Download, text: 'Installs straight to your home screen — no App Store, no download.' },
  { icon: BellRing, text: 'Push notifications the moment someone offers to help or drops you a message.' },
  { icon: MessagesSquare, text: 'Chat, post and reply from wherever you are on the island.' },
  { icon: Compass, text: 'Thumb-friendly bottom nav and full-screen island maps.' },
];

/** A lightweight device bezel so the app screenshots read as a real phone. */
function PhoneFrame({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div
      className={cx(
        'rounded-[2.6rem] border border-border bg-surface-2 p-2.5 shadow-[var(--shadow-float)]',
        className,
      )}
    >
      <img src={src} alt={alt} className="w-full rounded-[2.1rem]" loading="lazy" />
    </div>
  );
}

function FeatureList({ features }: { features: Feature[] }) {
  return (
    <ul className="mt-6 space-y-3.5">
      {features.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Icon size={15} />
          </span>
          <span className="leading-relaxed text-text-muted">{text}</span>
        </li>
      ))}
    </ul>
  );
}

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
      {/* Hero — copy paired with a real phone screenshot so the product leads. */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-14 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div>
            <p className="sq-rise sq-rise-1 text-sm font-medium uppercase tracking-[0.18em] text-primary">
              Bouônjour — Jersey’s neighbourly job board
            </p>
            <h1 className="sq-rise sq-rise-2 mt-5 font-display text-[clamp(2.5rem,4.4vw+0.6rem,4.5rem)] leading-[1.03] tracking-[-0.015em] text-text">
              Short jobs, done by <span className="sq-underline text-primary">your neighbours</span>.
            </h1>
            <p className="sq-rise sq-rise-3 mt-6 max-w-xl text-lg leading-relaxed text-text-muted">
              A Trinity hedge that wants a trim, a shop run into town, a flat-pack that won’t behave. Post your side quest and a
              local lends a hand — every job’s a day or two, every helper’s from the island.
            </p>
            <div className="sq-rise sq-rise-3 mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/login"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-base font-medium text-on-primary shadow-sm transition hover:bg-primary-hover"
              >
                Get started <ArrowRight size={18} />
              </Link>
              <Link
                to="/jobs"
                className="inline-flex h-12 items-center rounded-lg border border-border px-6 text-base font-medium text-text transition hover:bg-surface-2"
              >
                Browse jobs
              </Link>
            </div>
            <p className="sq-rise sq-rise-4 mt-5 text-sm text-text-muted">
              Free to post · Sign in with Google · Islanders helping islanders
            </p>
          </div>

          {/* The phone leads the page — big, framed, with a soft granite glow. */}
          <div className="sq-rise sq-rise-4 relative mx-auto w-full max-w-[320px] lg:ml-auto lg:mr-0">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-6 rounded-[3rem] bg-primary/15 blur-3xl"
            />
            <PhoneFrame
              src="/screenshots/mobile-1.png"
              alt="A SideQuest job open in the phone app"
              className="relative mx-auto max-w-[300px]"
            />
          </div>
        </div>
      </section>

      {/* Product tour — real desktop + PWA screenshots, alternating side to side. */}
      <section className="border-y border-border bg-surface-2/40">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <h2 className="font-display text-3xl text-text sm:text-4xl">See it in action</h2>
          <p className="mt-3 max-w-xl text-text-muted">
            One SideQuest, made to feel right whether you’re at your desk or halfway up a Trinity lane — it works beautifully
            on desktop and phone alike.
          </p>

          {/* Desktop — screenshot left, words right. */}
          <div className="mt-14 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-float)]">
              <img
                src="/screenshots/desktop.png"
                alt="Browsing SideQuest jobs on a laptop"
                className="w-full"
                loading="lazy"
              />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">On your laptop</p>
              <h3 className="mt-3 font-display text-2xl text-text sm:text-3xl">The whole island, on one screen</h3>
              <p className="mt-3 max-w-md leading-relaxed text-text-muted">
                SideQuest is built for a proper browse. Scan every open job across the parishes, narrow it to what’s near you,
                and see who needs a hand, where.
              </p>
              <FeatureList features={DESKTOP_FEATURES} />
            </div>
          </div>

          {/* Phone — words left, screenshot right. */}
          <div className="mt-16 grid items-center gap-10 sm:mt-20 lg:grid-cols-2 lg:gap-16">
            <div className="lg:order-2 lg:justify-self-end">
              <PhoneFrame
                src="/screenshots/mobile-2.png"
                alt="A SideQuest job open in the phone app"
                className="mx-auto max-w-[280px]"
              />
            </div>
            <div className="lg:order-1">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">In your pocket</p>
              <h3 className="mt-3 font-display text-2xl text-text sm:text-3xl">The island comes with you</h3>
              <p className="mt-3 max-w-md leading-relaxed text-text-muted">
                Add it to your home screen and SideQuest opens like a native app — the same jobs, the same island, wherever
                you happen to be.
              </p>
              <FeatureList features={PHONE_FEATURES} />
            </div>
          </div>
        </div>
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
              to="/login"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-base font-medium text-on-primary transition hover:bg-primary-hover"
            >
              Get started <ArrowRight size={18} />
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
