import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  MapPin,
  Clock,
  Banknote,
  Users,
  CalendarHeart,
  ArrowRight,
  Sparkles,
  Loader2,
  Compass,
} from 'lucide-react'
import { fields, opportunityTypes } from '../lib/constants'
import type { Opportunity, Student, Field, OpportunityType } from '../lib/types'
import { listOpportunities, searchStudents } from '../lib/db'
import { lookupCity, jerseyCoord } from '../lib/cities'
import { gradientFor } from '../lib/constants'
import { useToast } from '../components/Toast'

interface Cluster {
  city: string
  students: number
  universities: string[]
  lat?: number
  lng?: number
}

// ── Projection ───────────────────────────────────────────────────────────────
const VB = { w: 320, h: 460 }
const project = (lat: number, lng: number) => ({
  x: ((lng + 5.5) / 7.3) * VB.w,
  y: ((57.5 - lat) / 8.5) * VB.h,
})
const jersey = project(jerseyCoord.lat, jerseyCoord.lng)

function ChaptersMap({ clusters }: { clusters: Cluster[] }) {
  const [hover, setHover] = useState<string | null>(null)
  const mapped = clusters.filter((c) => c.lat != null && c.lng != null)
  const max = Math.max(1, ...mapped.map((c) => c.students))

  if (mapped.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center gap-2 py-20 text-center">
        <Compass className="h-8 w-8 text-ink-faint" />
        <p className="text-[15px] font-semibold text-ink">No students mapped yet</p>
        <p className="mx-auto max-w-xs text-[13px] text-ink-muted">
          As students add their UK city, this map fills in — showing firms exactly where
          Jersey talent clusters.
        </p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-granite-200 bg-gradient-to-b from-sea-50/70 via-white to-white p-4">
      <div className="pointer-events-none absolute inset-0 grain opacity-50" />
      <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="mx-auto h-[440px] w-full max-w-[320px]">
        {mapped.map((c) => {
          const p = project(c.lat!, c.lng!)
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

        {mapped.map((c) => {
          const p = project(c.lat!, c.lng!)
          const r = 8 + (c.students / max) * 14
          const active = hover === c.city
          return (
            <g
              key={c.city}
              onMouseEnter={() => setHover(c.city)}
              onMouseLeave={() => setHover(null)}
              className="cursor-pointer"
            >
              <circle cx={p.x} cy={p.y} r={r + 6} fill="#2f83f7" opacity={active ? 0.16 : 0.08} />
              <circle cx={p.x} cy={p.y} r={r} fill="url(#nodeGrad)" stroke="white" strokeWidth={2} />
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

        <g>
          <circle cx={jersey.x} cy={jersey.y} r={16} fill="#0a0a0b" />
          <circle cx={jersey.x} cy={jersey.y} r={16} fill="none" stroke="#2f83f7" strokeWidth={2}>
            <animate attributeName="r" values="16;22;16" dur="2.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8" dur="2.6s" repeatCount="indefinite" />
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
              const c = mapped.find((x) => x.city === hover)!
              return (
                <div>
                  <p className="text-[15px] font-semibold text-ink">
                    {c.students} Jersey {c.students === 1 ? 'student' : 'students'} in {c.city}
                  </p>
                  {c.universities.length > 0 && (
                    <p className="text-[12.5px] text-ink-muted">{c.universities.join(' · ')}</p>
                  )}
                </div>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HolidayHub({
  canApply,
  appliedOpps,
  onApply,
}: {
  canApply: boolean
  appliedOpps: Set<string>
  onApply: (id: string, label: string) => void
}) {
  const { notify } = useToast()
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  const [filter, setFilter] = useState<'All' | OpportunityType>('All')
  const [fieldFilter, setFieldFilter] = useState<Field | 'All'>('All')

  useEffect(() => {
    let alive = true
    Promise.all([listOpportunities(), searchStudents()])
      .then(([o, s]) => {
        if (!alive) return
        setOpps(o)
        setStudents(s)
      })
      .catch((e) => notify('Could not load the hub', e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [notify])

  const clusters = useMemo<Cluster[]>(() => {
    const byCity = new Map<string, { count: number; unis: Set<string> }>()
    for (const s of students) {
      const city = s.uk_city?.trim()
      if (!city) continue
      const key = city.toLowerCase()
      const entry = byCity.get(key) ?? { count: 0, unis: new Set<string>() }
      entry.count += 1
      if (s.university?.trim()) entry.unis.add(s.university.trim())
      byCity.set(key, entry)
    }
    return Array.from(byCity.entries())
      .map(([key, v]) => {
        const coord = lookupCity(key)
        return {
          city: key.replace(/\b\w/g, (m) => m.toUpperCase()),
          students: v.count,
          universities: Array.from(v.unis),
          lat: coord?.lat,
          lng: coord?.lng,
        }
      })
      .sort((a, b) => b.students - a.students)
  }, [students])

  const visible = useMemo(
    () =>
      opps.filter(
        (o) =>
          (filter === 'All' || o.type === filter) &&
          (fieldFilter === 'All' || o.field === fieldFilter),
      ),
    [opps, filter, fieldFilter],
  )

  const totalStudents = students.length
  const maxCluster = Math.max(1, ...clusters.map((c) => c.students))

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8">
        <span className="pill bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CalendarHeart className="h-3.5 w-3.5" /> Holiday Hub & Jersey Chapters
        </span>
        <h1 className="mt-3 text-[34px] font-semibold tracking-tight text-ink sm:text-[42px]">
          Build island roots — on your break.
        </h1>
        <p className="mt-1.5 max-w-2xl text-[16px] text-ink-muted">
          Short, break-timed shadowing days and agile projects posted by Jersey firms —
          plus a live map of where our talent is studying.
        </p>
      </div>

      {/* Holiday Hub */}
      <section className="mb-14">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[22px] font-semibold tracking-tight text-ink">
            Upcoming opportunities
          </h2>
          <div className="flex flex-wrap gap-2">
            {(['All', ...opportunityTypes] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                  filter === f ? 'bg-ink text-white' : 'bg-granite-100 text-ink-muted hover:bg-granite-200'
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

        {loading ? (
          <div className="card flex items-center justify-center gap-2 py-20 text-ink-muted">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : opps.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 py-16 text-center">
            <CalendarHeart className="h-8 w-8 text-ink-faint" />
            <p className="text-[17px] font-semibold text-ink">No opportunities yet</p>
            <p className="mx-auto max-w-sm text-[14px] text-ink-muted">
              Jersey employers post shadowing days and short projects here. Once they do,
              you’ll be able to apply in a tap.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="card py-16 text-center text-[15px] text-ink-muted">
            No opportunities match those filters yet.
          </div>
        ) : (
          <motion.div layout className="grid gap-4 sm:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {visible.map((o) => (
                <HolidayCard
                  key={o.id}
                  o={o}
                  canApply={canApply}
                  applied={appliedOpps.has(o.id)}
                  onApply={() => onApply(o.id, o.company)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {/* Chapters */}
      <section>
        <div className="mb-5">
          <span className="section-label">Jersey Chapters</span>
          <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-ink">
            Where our talent is right now
          </h2>
          <p className="mt-1 max-w-lg text-[15px] text-ink-muted">
            {totalStudents === 0
              ? 'No students on the platform yet — as they join, their cities light up here.'
              : `${totalStudents} ${totalStudents === 1 ? 'student' : 'students'} across ${
                  clusters.length
                } ${clusters.length === 1 ? 'city' : 'cities'} — so firms host pop-ups where the talent clusters.`}
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <ChaptersMap clusters={clusters} />

          <div className="card p-5">
            <p className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
              <Users className="h-4 w-4" /> Student clusters
            </p>
            {clusters.length === 0 ? (
              <div className="py-10 text-center text-[13.5px] text-ink-muted">
                No student locations yet.
              </div>
            ) : (
              <div className="space-y-1">
                {clusters.map((c) => (
                  <div
                    key={c.city}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-granite-50"
                  >
                    <span className="w-24 shrink-0 truncate text-[14px] font-semibold text-ink">
                      {c.city}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-granite-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sea-400 to-sea-700"
                        style={{ width: `${(c.students / maxCluster) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-[13px] font-medium text-ink-muted">
                      {c.students}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function HolidayCard({
  o,
  canApply,
  applied,
  onApply,
}: {
  o: Opportunity
  canApply: boolean
  applied: boolean
  onApply: () => void
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
            className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradientFor(
              o.company,
            )} text-[15px] font-semibold text-white shadow-soft`}
          >
            {o.company.slice(0, 2)}
          </span>
          <div>
            <p className="text-[16px] font-semibold text-ink">{o.company}</p>
            {o.location && <p className="text-[12.5px] text-ink-muted">{o.location}</p>}
          </div>
        </div>
        <span className="pill bg-amber-50 text-amber-700">
          <Sparkles className="h-3 w-3" /> {o.type}
        </span>
      </div>

      <h3 className="mt-4 text-[16px] font-semibold text-ink">{o.role}</h3>
      {o.summary && (
        <p className="mt-1.5 flex-1 text-[14px] leading-snug text-ink-muted">{o.summary}</p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 text-[12px]">
        {o.window && (
          <span className="inline-flex items-center gap-1 text-ink-muted">
            <Clock className="h-3.5 w-3.5 text-sea-500" /> {o.window.split(' · ')[0]}
          </span>
        )}
        {o.paid && (
          <span className="inline-flex items-center gap-1 text-ink-muted">
            <Banknote className="h-3.5 w-3.5 text-sea-500" /> {o.paid}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-ink-muted">
          <MapPin className="h-3.5 w-3.5 text-sea-500" /> {o.spots} {o.spots === 1 ? 'spot' : 'spots'}
        </span>
      </div>

      {canApply ? (
        <button
          onClick={onApply}
          disabled={applied}
          className={`mt-4 w-full py-2.5 text-[14px] ${
            applied ? 'btn bg-emerald-500 text-white' : 'btn-accent'
          }`}
        >
          {applied ? (
            'Applied'
          ) : (
            <>
              Apply for this slot
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      ) : (
        <div className="mt-4 rounded-full bg-granite-100 py-2.5 text-center text-[13px] font-medium text-ink-muted">
          Students can apply to this
        </div>
      )}
    </motion.div>
  )
}
