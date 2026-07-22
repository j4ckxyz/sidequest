import { motion } from 'framer-motion'
import {
  ArrowRight,
  Search,
  GraduationCap,
  CalendarHeart,
  Sparkles,
  MapPin,
  Award,
  Users,
} from 'lucide-react'
import type { View } from './Nav'
import { stats, students } from '../data/mockData'
import Avatar from './Avatar'

const fade = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

export default function Landing({ setView }: { setView: (v: View) => void }) {
  return (
    <div className="relative overflow-hidden">
      {/* Ambient gradient field */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-sea-200/70 via-sea-100/40 to-transparent blur-3xl" />
        <div className="absolute right-[-10%] top-40 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-fuchsia-200/40 to-transparent blur-3xl animate-float-slow" />
        <div className="absolute left-[-8%] top-[420px] h-[360px] w-[360px] rounded-full bg-gradient-to-br from-emerald-200/40 to-transparent blur-3xl" />
        <div className="absolute inset-0 grain opacity-60" />
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-16 text-center sm:pt-24">
        <motion.div
          custom={0}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-sea-200 bg-white/70 px-4 py-1.5 text-[13px] font-medium text-sea-700 shadow-soft backdrop-blur"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Built for the island. Bringing our talent home.
        </motion.div>

        <motion.h1
          custom={1}
          variants={fade}
          initial="hidden"
          animate="show"
          className="text-balance mx-auto max-w-4xl text-[42px] font-semibold leading-[1.04] tracking-[-0.03em] text-ink sm:text-[68px]"
        >
          Flipping the script on the{' '}
          <span className="bg-gradient-to-br from-sea-500 to-sea-800 bg-clip-text text-transparent">
            Jersey brain drain.
          </span>
        </motion.h1>

        <motion.p
          custom={2}
          variants={fade}
          initial="hidden"
          animate="show"
          className="text-balance mx-auto mt-6 max-w-2xl text-[18px] leading-relaxed text-ink-muted sm:text-[21px]"
        >
          Your bridge from UK universities back to the Rock. Instead of chasing jobs,
          Jersey students get discovered — by the island’s best firms, before they even
          graduate.
        </motion.p>

        <motion.div
          custom={3}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <button onClick={() => setView('student')} className="btn-accent group px-6 py-3 text-[15px]">
            I’m a student
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button onClick={() => setView('employer')} className="btn-primary px-6 py-3 text-[15px]">
            I’m hiring in Jersey
          </button>
        </motion.div>

        {/* Stat strip */}
        <motion.div
          custom={4}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            { label: 'Students on-platform', value: stats.students, icon: GraduationCap },
            { label: 'Jersey employers', value: stats.employers, icon: Users },
            { label: 'Bursaries mapped', value: stats.bursaries, icon: Award },
            { label: 'UK cities', value: stats.ukCities, icon: MapPin },
          ].map((s) => (
            <div key={s.label} className="card px-4 py-5">
              <s.icon className="mx-auto mb-2 h-5 w-5 text-sea-500" />
              <div className="text-[28px] font-semibold tracking-tight text-ink">
                {s.value}
              </div>
              <div className="mt-0.5 text-[12.5px] leading-tight text-ink-muted">
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Floating showcase preview */}
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
                <p className="section-label">Reverse Talent Marketplace</p>
                <p className="mt-1 text-[15px] text-ink-muted">
                  Employers search students — not the other way around.
                </p>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-granite-200 bg-white px-3.5 py-2 text-[14px] text-ink-muted sm:flex">
                <Search className="h-4 w-4" />
                Filtering “Computer Science”…
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {students
                .filter((s) => s.featured)
                .slice(0, 3)
                .map((s, i) => (
                  <motion.button
                    key={s.id}
                    onClick={() => setView('employer')}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + i * 0.12 }}
                    className="group flex flex-col items-start gap-3 rounded-2xl border border-granite-200/80 bg-white p-4 text-left shadow-soft transition-all hover:-translate-y-1 hover:shadow-float"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar initials={s.initials} gradient={s.avatarColor} size="md" />
                      <div>
                        <p className="text-[15px] font-semibold text-ink">{s.name}</p>
                        <p className="text-[12.5px] text-ink-muted">{s.degree}</p>
                      </div>
                    </div>
                    <p className="line-clamp-2 text-[13px] leading-snug text-ink-muted">
                      {s.headline}
                    </p>
                    <span className="pill bg-sea-50 text-sea-700">
                      {s.university.replace('University of ', '')}
                    </span>
                  </motion.button>
                ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Feature pillars */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-10 text-center">
          <p className="section-label">One platform, four bridges home</p>
          <h2 className="text-balance mx-auto mt-3 max-w-2xl text-[32px] font-semibold tracking-tight text-ink sm:text-[40px]">
            Everything a Jersey student needs to build a career on-island.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              icon: Search,
              title: 'Reverse Talent Marketplace',
              body: 'Students showcase real projects — dissertations, GitHub repos, design work. Employers headhunt proof of capability, not just a CV.',
              tint: 'from-sea-500 to-sea-700',
              action: 'employer' as View,
              cta: 'Open employer portal',
            },
            {
              icon: Award,
              title: 'Bursary Matchmaker',
              body: 'Every Jersey bursary, grant and undergraduate scheme in one place. Enter your degree, see exactly what you qualify for.',
              tint: 'from-emerald-500 to-teal-700',
              action: 'student' as View,
              cta: 'Try the matchmaker',
            },
            {
              icon: CalendarHeart,
              title: 'Holiday Hub',
              body: 'One-day shadowing and two-week agile projects timed to uni breaks. Build local relationships without giving up your summer.',
              tint: 'from-amber-500 to-orange-700',
              action: 'hub' as View,
              cta: 'Browse the Holiday Hub',
            },
            {
              icon: MapPin,
              title: 'Jersey Chapters',
              body: 'See where Jersey students cluster across the UK — “15 in Bristol” — so firms host pop-ups exactly where the talent is.',
              tint: 'from-fuchsia-500 to-violet-700',
              action: 'hub' as View,
              cta: 'See the chapters map',
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
              <h3 className="text-[21px] font-semibold tracking-tight text-ink">
                {f.title}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{f.body}</p>
              <button
                onClick={() => setView(f.action)}
                className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-sea-600 transition-colors hover:text-sea-800"
              >
                {f.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Closing band */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="relative overflow-hidden rounded-4xl bg-ink px-8 py-14 text-center text-white shadow-float sm:px-16 sm:py-20">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-sea-500/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-fuchsia-500/30 blur-3xl" />
          <h2 className="text-balance mx-auto max-w-2xl text-[32px] font-semibold tracking-tight sm:text-[44px]">
            The talent left the island. Let’s bring it home.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[17px] text-white/70">
            Join the students and Jersey firms already building the island’s next
            generation of talent.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={() => setView('student')}
              className="btn bg-white px-6 py-3 text-[15px] font-medium text-ink hover:bg-granite-100"
            >
              Create your profile
            </button>
            <button
              onClick={() => setView('employer')}
              className="btn border border-white/25 px-6 py-3 text-[15px] font-medium text-white hover:bg-white/10"
            >
              Start headhunting
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
