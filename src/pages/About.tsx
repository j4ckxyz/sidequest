import { Link } from 'react-router-dom';
import { Compass, HandHeart, MapPin, MessageCircle, ShieldCheck, Sparkles, Lock, Eye, ThumbsUp, ThumbsDown } from 'lucide-react';

export function About() {
  return (
    <div className="mx-auto max-w-2xl px-6 pt-12 pb-20">
      <div className="flex items-center gap-2 text-primary">
        <Compass size={22} strokeWidth={2.25} />
        <span className="font-display text-xl text-text">SideQuest</span>
      </div>
      <h1 className="mt-5 text-3xl font-semibold leading-tight text-text">Short local jobs, done by your neighbours.</h1>
      <p className="mt-3 text-base leading-relaxed text-text-muted">
        SideQuest is a friendly noticeboard for Jersey. Need a hand with the garden, a lift to the shops, or someone to walk the
        dog? Post it, and a neighbour nearby picks it up. Want to earn a bit helping out? Browse jobs across all twelve parishes and
        apply in a tap. Everyone can do both.
      </p>

      <Section icon={HandHeart} title="How it works">
        <ol className="space-y-2 text-sm leading-relaxed text-text-muted">
          <li><Step n={1} /> Post a short job — what you need, where, and roughly what you'll pay.</li>
          <li><Step n={2} /> Neighbours nearby see it and apply, with a message and their rate.</li>
          <li><Step n={3} /> You pick someone, sort the details in chat, and they get it done.</li>
          <li><Step n={4} /> Leave each other a review so the island builds trust over time.</li>
        </ol>
      </Section>

      <Section icon={ShieldCheck} title="Keeping SideQuest safe">
        <p className="text-sm leading-relaxed text-text-muted">
          Anyone can report a job or a person that looks off. Every report is read straight away by an AI moderator that checks it
          against our community rules — and a real admin can step in at any point. If something breaks the rules, the post is taken
          down; repeat offenders get banned or suspended. You'll always be told clearly if your account is restricted, and why.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <RuleCard good title="Welcome here" icon={ThumbsUp}>
            Real local tasks · fair, upfront pay · payment and chat kept on SideQuest · honest reviews · being decent to each other.
          </RuleCard>
          <RuleCard title="Not allowed" icon={ThumbsDown}>
            Scams or "get rich quick" schemes · asking to pay off-platform or via gift cards/crypto · spam and advertising · anything
            illegal · harassment or abuse.
          </RuleCard>
        </div>
      </Section>

      <Section icon={Lock} title="Your privacy">
        <ul className="space-y-2 text-sm leading-relaxed text-text-muted">
          <li className="flex gap-2"><Eye size={16} className="mt-0.5 shrink-0 text-sage" /> Your exact location and contact details stay hidden until you choose to share them — job locations only show a parish to people who aren't signed in.</li>
          <li className="flex gap-2"><MessageCircle size={16} className="mt-0.5 shrink-0 text-sage" /> Messages are private between you and the other person.</li>
          <li className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-sage" /> We don't sell your data or show you ads. We only use it to run SideQuest and suggest jobs you might like.</li>
        </ul>
      </Section>

      <Section icon={Sparkles} title="How the job suggestions work">
        <p className="text-sm leading-relaxed text-text-muted">
          The "Picked for you" jobs are matched to what you've told us you're interested in — your skills, the categories you like,
          and a quick optional chat. It's there to save you scrolling; you can always browse everything yourself, and you can update
          or clear your preferences whenever you like in Settings.
        </p>
      </Section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/jobs" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-primary hover:bg-primary-hover">
          <MapPin size={16} /> Browse jobs
        </Link>
        <Link to="/jobs/new" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text hover:bg-surface-2">
          Post a job
        </Link>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Compass; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-text">
        <Icon size={18} className="text-primary" /> {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Step({ n }: { n: number }) {
  return <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">{n}</span>;
}

function RuleCard({ title, icon: Icon, good, children }: { title: string; icon: typeof Compass; good?: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className={`flex items-center gap-1.5 text-sm font-medium ${good ? 'text-sage' : 'text-danger'}`}>
        <Icon size={15} /> {title}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{children}</p>
    </div>
  );
}
