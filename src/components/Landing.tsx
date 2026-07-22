import { motion } from 'framer-motion'
import {
  ArrowRight,
  Compass,
  Sparkles,
  Users,
  MessageCircle,
  Coins,
  Bus,
  ShieldCheck,
  MapPin,
  Trophy,
} from 'lucide-react'
import type { Role } from '../lib/types'
import { iconForCategory } from '../lib/constants'

const fade = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

const previewQuests = [
  { title: 'Mow the front lawn', cat: 'Gardening', parish: 'St Ouen', reward: 15, xp: 150 },
  { title: 'Set up parish fête stalls', cat: 'Events', parish: 'St Helier', reward: 40, xp: 400 },
  { title: 'Help Nan with her iPad', cat: 'Tech Help', parish: 'St Brelade', reward: 10, xp: 100 },
]

export default function Landing({ onStart }: { onStart: (role: Role) => void }) {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-jersey-200/70 via-jersey-100/40 to-transparent blur-3xl" />
        <div className="absolute right-[-10%] top-40 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-jersey-200/40 to-transparent blur-3xl animate-float-slow" />
        <div className="absolute left-[-8%] top-[420px] h-[360px] w-[360px] rounded-full bg-gradient-to-br from-clay-100/50 to-transparent blur-3xl" />
        <div className="absolute inset-0 grain opacity-60" />
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-16 text-center sm:pt-24">
        <motion.div
          custom={0}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-jersey-200 bg-white/70 px-4 py-1.5 text-[13px] font-medium text-jersey-700 shadow-soft backdrop-blur"
        >
          <MapPin className="h-3.5 w-3.5" />
          Made in Jersey · for the whole island
        </motion.div>

        <motion.h1
          custom={1}
          variants={fade}
          initial="hidden"
          animate="show"
          className="display text-balance mx-auto max-w-4xl text-[44px] font-semibold leading-[1.05] text-ink sm:text-[68px]"
        >
          Turn community chores into{' '}
          <span className="italic text-clay-600">completed quests.</span>
        </motion.h1>

        <motion.p
          custom={2}
          variants={fade}
          initial="hidden"
          animate="show"
          className="text-balance mx-auto mt-6 max-w-2xl text-[18px] leading-relaxed text-ink-muted sm:text-[21px]"
        >
          Earn money, help neighbours, and level up. SideQuest connects Jersey residents who
          need a hand with local teens ready to take on the task — one parish at a time.
        </motion.p>

        <motion.div
          custom={3}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <button onClick={() => onStart('doer')} className="btn-accent group px-6 py-3 text-[15px]">
            Start earning as a Doer
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button onClick={() => onStart('poster')} className="btn-primary px-6 py-3 text-[15px]">
            Post a quest
          </button>
        </motion.div>

        <motion.div
          custom={4}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            { label: 'Earn pocket money', icon: Coins },
            { label: 'Level up with XP', icon: Trophy },
            { label: 'Team up in parties', icon: Users },
            { label: 'Safe on-platform chat', icon: MessageCircle },
          ].map((s) => (
            <div key={s.label} className="card px-4 py-5">
              <s.icon className="mx-auto mb-2 h-5 w-5 text-jersey-500" />
              <div className="text-[13px] font-medium leading-tight text-ink-soft">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Product preview */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-5xl px-5 pb-6"
      >
        <div className="relative overflow-hidden rounded-4xl border border-white/70 bg-white/60 p-3 shadow-float backdrop-blur-xl sm:p-5">
          <div className="rounded-[1.6rem] bg-gradient-to-b from-granite-50 to-white p-5 sm:p-8">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="section-label">The Quest Board</p>
                <p className="mt-1 text-[15px] text-ink-muted">Local jobs, organised by parish Guild.</p>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-granite-200 bg-white px-3.5 py-2 text-[14px] text-ink-muted sm:flex">
                <MapPin className="h-4 w-4 text-jersey-500" />
                St Ouen Guild
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {previewQuests.map((q, i) => {
                const CatIcon = iconForCategory(q.cat)
                return (
                  <motion.div
                    key={q.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + i * 0.12 }}
                    className="flex flex-col gap-3 rounded-2xl border border-black/[0.07] bg-white p-4 text-left shadow-soft"
                  >
                    <span className="pill w-fit bg-granite-100 text-ink-soft">
                      <CatIcon className="h-3.5 w-3.5" /> {q.cat}
                    </span>
                    <p className="text-[15px] font-semibold leading-snug text-ink">{q.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="pill bg-clay-50 text-clay-700">
                        <Coins className="h-3.5 w-3.5" /> £{q.reward}
                      </span>
                      <span className="pill bg-granite-100 text-ink-soft">
                        <Sparkles className="h-3.5 w-3.5" /> +{q.xp}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[12px] text-ink-faint">
                      <MapPin className="h-3.5 w-3.5" /> {q.parish} Guild
                    </span>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Feature pillars */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-10 text-center">
          <p className="section-label">A whole ecosystem, one warm home</p>
          <h2 className="display text-balance mx-auto mt-3 max-w-2xl text-[32px] font-semibold text-ink sm:text-[42px]">
            Everything you need to quest across the Rock.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              icon: Trophy,
              title: 'XP & Ranks',
              body: 'Every completed quest earns XP on a warm terracotta progress bar. Climb from Novice Adventurer to Local Legend.',
              tint: 'from-clay-500 to-clay-700',
              role: 'doer' as Role,
              cta: 'Start levelling up',
            },
            {
              icon: Compass,
              title: 'Quest Board & Guilds',
              body: 'A live marketplace organised by all 12 parish Guilds. Filter single-time vs weekly, and spot Bus-Route-Friendly tasks.',
              tint: 'from-[#93a08a] to-[#6c7860]',
              role: 'doer' as Role,
              cta: 'Browse the board',
            },
            {
              icon: Users,
              title: 'Quest Party',
              body: 'Big job? Set a party size. Teens team up or fill open slots, and the reward splits equally across the party.',
              tint: 'from-[#c7ab74] to-[#9c7f4c]',
              role: 'poster' as Role,
              cta: 'Post a group gig',
            },
            {
              icon: MessageCircle,
              title: 'Safe-Chat',
              body: 'Built-in live messaging on every quest, so posters and doers coordinate without ever swapping phone numbers.',
              tint: 'from-clay-600 to-clay-800',
              role: 'poster' as Role,
              cta: 'See how it works',
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="group card overflow-hidden p-7 transition-all hover:shadow-float"
            >
              <div
                className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${f.tint} text-white shadow-soft`}
              >
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-[21px] font-semibold tracking-tight text-ink">{f.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{f.body}</p>
              <button
                onClick={() => onStart(f.role)}
                className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-jersey-600 transition-colors hover:text-jersey-800"
              >
                {f.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trust band */}
      <section className="mx-auto max-w-6xl px-5 pb-8">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: 'Community Verified', body: 'Trusted posters carry a verified badge so doers know who they’re helping.' },
            { icon: Bus, title: 'Bus-route friendly', body: 'Tasks along LibertyBus routes are tagged, so non-drivers can reach them.' },
            { icon: MessageCircle, title: 'Stay on-platform', body: 'Coordinate through Safe-Chat — no personal numbers exchanged.' },
          ].map((t) => (
            <div key={t.title} className="card flex items-start gap-3 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-jersey-50 text-jersey-600">
                <t.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-ink">{t.title}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{t.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Closing */}
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-8">
        <div className="relative overflow-hidden rounded-4xl bg-jersey-600 px-8 py-14 text-center text-white shadow-float sm:px-16 sm:py-20">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-jersey-900/40 blur-3xl" />
          <h2 className="display text-balance mx-auto max-w-2xl text-[34px] font-semibold sm:text-[46px]">
            Ready to conquer the Rock?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[17px] text-white/80">
            Join the islanders turning everyday chores into quests — and pocket money.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={() => onStart('doer')}
              className="btn bg-white px-6 py-3 text-[15px] font-medium text-jersey-700 hover:bg-granite-100"
            >
              Become a Quest Doer
            </button>
            <button
              onClick={() => onStart('poster')}
              className="btn border border-white/30 px-6 py-3 text-[15px] font-medium text-white hover:bg-white/10"
            >
              Post your first quest
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
