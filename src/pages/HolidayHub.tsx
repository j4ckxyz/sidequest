import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  MapPin,
  Clock,
  Banknote,
  Users,
  CalendarHeart,
  Coffee,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import {
  internships,
  chapters,
  mentors,
  fields,
  stats,
  type Internship,
  type Field,
} from '../data/mockData'
import Avatar from '../components/Avatar'
import { useToast } from '../components/Toast'

// ── Chapters map projection ──────────────────────────────────────────────────
const VB = { w: 320, h: 440 }
// Small manual nudges to stop tightly-clustered cities from overlapping.
const nudges: Record<string, { x: number; y: number }> = {
  Bristol: { x: 18, y: -6 },
  Cardiff: { x: -30, y: 2 },
  Exeter: { x: 4, y: 16 },
}
const project = (lat: number, lng: number, city?: string) => {
  const n = city ? nudges[city] : undefined
  return {
    x: ((lng + 5) / 6.5) * VB.w + (n?.x ?? 0),
    y: ((56 - lat) / 7) * VB.h + (n?.y ?? 0),
  }
}
const jersey = project(49.21, -2.13)

function ChaptersMap() {
  const [hover, setHover] = useState<string | null>(null)
  const max = Math.max(...chapters.map((c) => c.students))

  return (
    <div className="relative overflow-hidden rounded-3xl border border-granite-200 bg-gradient-to-b from-sea-50/70 via-white to-white p-4">
      <div className="pointer-events-none absolute inset-0 grain opacity-50" />
      <svg
        viewBox={`0 0 ${VB.w} ${VB.h}`}
        className="mx-auto h-[420px] w-full max-w-[320px]"
      >
        {/* Connection lines to Jersey */}
        {chapters.map((c) => {
          const p = project(c.lat, c.lng, c.city)
          return (
            <line
              key={`l-${c.city}`}
              x1={p.x}
              y1={p.y}
              x2={jersey.x}
              y2={jersey.y}
              stroke="#2f83f7"
              strokeWidth={hover === c.city ? 1.6 : 0.7}
              strokeOpacity={hover === c.city ? 0.6 : 0.22}
              strokeDasharray="3 4"
            />
          )
        })}

        {/* City nodes */}
        {chapters.map((c) => {
          const p = project(c.lat, c.lng, c.city)
          const r = 7 + (c.students / max) * 15
          const active = hover === c.city
          return (
            <g
              key={c.city}
              onMouseEnter={() => setHover(c.city)}
              onMouseLeave={() => setHover(null)}
              className="cursor-pointer"
            >
              <circle cx={p.x} cy={p.y} r={r + 6} fill="#2f83f7" opacity={active ? 0.16 : 0.08} />
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill="url(#nodeGrad)"
                stroke="white"
                strokeWidth={2}
                className="transition-all"
              />
              <text
                x={p.x}
                y={p.y + 4}
                textAnchor="middle"
                className="fill-white font-semibold"
                style={{ fontSize: 11 }}
              >
                {c.students}
              </text>
              <text
                x={p.x}
                y={p.y - r - 6}
                textAnchor="middle"
                className={active ? 'fill-ink' : 'fill-ink-muted'}
                style={{ fontSize: 11, fontWeight: 600 }}
              >
                {c.city}
              </text>
            </g>
          )
        })}

        {/* Jersey home node */}
        <g>
          <circle cx={jersey.x} cy={jersey.y} r={16} fill="#0a0a0b" />
          <circle cx={jersey.x} cy={jersey.y} r={16} fill="none" stroke="#2f83f7" strokeWidth={2}>
            <animate attributeName="r" values="16;22;16" dur="2.6s" repeatCount="indefinite" />
            <animate
              attributeName="opacity"
              values="0.8;0;0.8"
              dur="2.6s"
              repeatCount="indefinite"
            />
          </circle>
          <text
            x={jersey.x}
            y={jersey.y + 4}
            textAnchor="middle"
            className="fill-white"
            style={{ fontSize: 9, fontWeight: 700 }}
          >
            JSY
          </text>
          <text
            x={jersey.x}
            y={jersey.y + 32}
            textAnchor="middle"
            className="fill-ink"
            style={{ fontSize: 11, fontWeight: 700 }}
          >
            Jersey · home
          </text>
        </g>

        <defs>
          <linearGradient id="nodeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#59a5ff" />
            <stop offset="1" stopColor="#164ec4" />
          </linearGradient>
        </defs>
      </svg>

      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/70 bg-white/85 p-3.5 shadow-float backdrop-blur-xl"
          >
            {(() => {
              const c = chapters.find((x) => x.city === hover)!
              return (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-semibold text-ink">
                      {c.students} Jersey students in {c.city}
                    </p>
                    <p className="text-[12.5px] text-ink-muted">
                      {c.universities.join(' · ')}
                    </p>
                  </div>
                  <span className="pill shrink-0 bg-sea-50 text-sea-700">{c.nextPopup}</span>
                </div>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
const breakFilters = ['All', '1-day Shadow', '2-week Project', 'Reading Week'] as const

export default function HolidayHub() {
  const { notify } = useToast()
  const [filter, setFilter] = useState<(typeof breakFilters)[number]>('All')
  const [fieldFilter, setFieldFilter] = useState<Field | 'All'>('All')

  const visible = useMemo(
    () =>
      internships.filter(
        (i) =>
          (filter === 'All' || i.type === filter) &&
          (fieldFilter === 'All' || i.field === fieldFilter),
      ),
    [filter, fieldFilter],
  )

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      {/* Header */}
      <div className="mb-8">
        <span className="pill bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CalendarHeart className="h-3.5 w-3.5" /> Holiday Hub & Jersey Chapters
        </span>
        <h1 className="mt-3 text-[34px] font-semibold tracking-tight text-ink sm:text-[42px]">
          Build island roots — on your break.
        </h1>
        <p className="mt-1.5 max-w-2xl text-[16px] text-ink-muted">
          Low-pressure shadowing days and two-week agile projects timed to the uni
          calendar. Enjoy your holidays and keep your foot in the door back home.
        </p>
      </div>

      {/* Holiday Hub */}
      <section className="mb-14">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[22px] font-semibold tracking-tight text-ink">
            Upcoming opportunities
          </h2>
          <div className="flex flex-wrap gap-2">
            {breakFilters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                  filter === f
                    ? 'bg-ink text-white'
                    : 'bg-granite-100 text-ink-muted hover:bg-granite-200'
                }`}
              >
                {f === 'All' ? 'All types' : f}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {(['All', ...fields] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFieldFilter(f)}
              className={`rounded-full px-3 py-1 text-[12.5px] font-medium transition ${
                fieldFilter === f
                  ? 'bg-sea-600 text-white'
                  : 'bg-white text-ink-muted ring-1 ring-granite-200 hover:ring-sea-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="card py-16 text-center text-[15px] text-ink-muted">
            No opportunities match those filters yet — check back soon.
          </div>
        ) : (
          <motion.div layout className="grid gap-4 sm:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {visible.map((i) => (
                <HolidayCard key={i.id} i={i} onApply={notify} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {/* Jersey Chapters */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <span className="section-label">Jersey Chapters</span>
            <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-ink">
              Where our talent is right now
            </h2>
            <p className="mt-1 max-w-lg text-[15px] text-ink-muted">
              {stats.students} Jersey students mapped across {chapters.length} UK cities —
              so firms host pop-ups exactly where the talent clusters.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <ChaptersMap />

          <div className="space-y-4">
            {/* Chapter list */}
            <div className="card p-5">
              <p className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
                <Users className="h-4 w-4" /> Student clusters
              </p>
              <div className="space-y-1">
                {[...chapters]
                  .sort((a, b) => b.students - a.students)
                  .map((c) => (
                    <div
                      key={c.city}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-granite-50"
                    >
                      <span className="w-16 shrink-0 text-[14px] font-semibold text-ink">
                        {c.city}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-granite-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sea-400 to-sea-700"
                          style={{
                            width: `${(c.students / Math.max(...chapters.map((x) => x.students))) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-6 shrink-0 text-right text-[13px] font-medium text-ink-muted">
                        {c.students}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Mentors */}
            <div className="card p-5">
              <p className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
                <Coffee className="h-4 w-4" /> Mentors offering coffee-chats
              </p>
              <div className="space-y-2.5">
                {mentors.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <Avatar initials={m.initials} gradient={m.avatarColor} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-ink">
                        {m.name}
                      </p>
                      <p className="truncate text-[12px] text-ink-muted">
                        {m.role} · {m.company}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        notify(
                          `Coffee-chat requested with ${m.name.split(' ')[0]}`,
                          m.format,
                        )
                      }
                      className="btn-ghost shrink-0 px-3 py-1.5 text-[12.5px]"
                    >
                      Connect
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function HolidayCard({
  i,
  onApply,
}: {
  i: Internship
  onApply: (title: string, detail?: string) => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="group card flex flex-col p-5 transition-all hover:-translate-y-1 hover:shadow-float"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${i.logoColor} text-[15px] font-semibold text-white shadow-soft`}
          >
            {i.company.slice(0, 2)}
          </span>
          <div>
            <p className="text-[16px] font-semibold text-ink">{i.company}</p>
            <p className="text-[12.5px] text-ink-muted">{i.location}</p>
          </div>
        </div>
        <span className="pill bg-amber-50 text-amber-700">
          <Sparkles className="h-3 w-3" /> {i.type}
        </span>
      </div>

      <h3 className="mt-4 text-[16px] font-semibold text-ink">{i.role}</h3>
      <p className="mt-1.5 flex-1 text-[14px] leading-snug text-ink-muted">{i.summary}</p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-[12px]">
        <span className="inline-flex items-center gap-1 text-ink-muted">
          <Clock className="h-3.5 w-3.5 text-sea-500" /> {i.window.split(' · ')[0]}
        </span>
        <span className="inline-flex items-center gap-1 text-ink-muted">
          <Banknote className="h-3.5 w-3.5 text-sea-500" /> {i.paid}
        </span>
        <span className="inline-flex items-center gap-1 text-ink-muted">
          <MapPin className="h-3.5 w-3.5 text-sea-500" /> {i.spots} spots
        </span>
      </div>

      <button
        onClick={() =>
          onApply(`Applied to ${i.company}`, `${i.role} · ${i.window}`)
        }
        className="btn-accent mt-4 w-full py-2.5 text-[14px]"
      >
        Apply for this slot
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </motion.div>
  )
}
