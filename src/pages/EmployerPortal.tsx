import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  GraduationCap,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react'
import { students, fields, type Student, type Field } from '../data/mockData'
import Avatar from '../components/Avatar'
import StudentModal from '../components/StudentModal'

export default function EmployerPortal() {
  const [query, setQuery] = useState('')
  const [activeField, setActiveField] = useState<Field | 'All'>('All')
  const [year, setYear] = useState<number | 'All'>('All')
  const [selected, setSelected] = useState<Student | null>(null)

  const years = useMemo(
    () => Array.from(new Set(students.map((s) => s.graduationYear))).sort(),
    [],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return students.filter((s) => {
      const matchField = activeField === 'All' || s.field === activeField
      const matchYear = year === 'All' || s.graduationYear === year
      const matchQuery =
        !q ||
        [
          s.name,
          s.degree,
          s.field,
          s.university,
          s.headline,
          s.ukCity,
          ...s.skills,
          ...s.projects.flatMap((p) => [p.title, ...p.tags]),
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)
      return matchField && matchYear && matchQuery
    })
  }, [query, activeField, year])

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="pill bg-ink text-white">
              <Users className="h-3.5 w-3.5" /> Employer portal
            </span>
            <span className="text-[13px] text-ink-faint">Signed in as Carey Olsen · HR</span>
          </div>
          <h1 className="text-[34px] font-semibold tracking-tight text-ink sm:text-[42px]">
            Find your next hire.
          </h1>
          <p className="mt-1.5 max-w-xl text-[16px] text-ink-muted">
            Search Jersey students by field, skill or project. Headhunt proven talent
            before they graduate.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-granite-200 bg-white px-4 py-3 shadow-soft">
          <div className="text-center">
            <div className="text-[22px] font-semibold text-ink">{students.length}</div>
            <div className="text-[11px] uppercase tracking-wide text-ink-faint">Talent</div>
          </div>
          <div className="h-8 w-px bg-granite-200" />
          <div className="text-center">
            <div className="text-[22px] font-semibold text-sea-600">{results.length}</div>
            <div className="text-[11px] uppercase tracking-wide text-ink-faint">Matches</div>
          </div>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="sticky top-[76px] z-30 mb-6 rounded-3xl border border-white/70 bg-white/75 p-3 shadow-glass backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try “Finance”, “Rust”, “tidal energy”, “Bristol”…"
              className="field pl-11"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 pl-1 text-[13px] font-medium text-ink-faint sm:flex">
              <SlidersHorizontal className="h-4 w-4" /> Year
            </span>
            <select
              value={year}
              onChange={(e) =>
                setYear(e.target.value === 'All' ? 'All' : Number(e.target.value))
              }
              className="field w-auto cursor-pointer py-2.5 pr-8"
            >
              <option value="All">All years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  Class of {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Field chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          {(['All', ...fields] as const).map((f) => {
            const active = activeField === f
            return (
              <button
                key={f}
                onClick={() => setActiveField(f)}
                className={`rounded-full px-3.5 py-1.5 text-[13.5px] font-medium transition-all ${
                  active
                    ? 'bg-sea-600 text-white shadow-[0_8px_20px_-8px_rgba(26,99,230,0.7)]'
                    : 'bg-granite-100 text-ink-muted hover:bg-granite-200'
                }`}
              >
                {f}
              </button>
            )
          })}
        </div>
      </div>

      {/* Results grid */}
      {results.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-20 text-center">
          <Search className="h-8 w-8 text-ink-faint" />
          <p className="text-[17px] font-medium text-ink">No students match that yet.</p>
          <p className="text-[14px] text-ink-muted">
            Try a broader search or clear the filters.
          </p>
          <button
            onClick={() => {
              setQuery('')
              setActiveField('All')
              setYear('All')
            }}
            className="btn-ghost mt-2 py-2 text-[14px]"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {results.map((s) => (
              <motion.button
                key={s.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => setSelected(s)}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-granite-200/80 bg-white p-5 text-left shadow-soft transition-all hover:-translate-y-1 hover:border-sea-200 hover:shadow-float"
              >
                {s.featured && (
                  <span className="pill absolute right-4 top-4 bg-amber-100 text-amber-700">
                    <Sparkles className="h-3 w-3" /> Top match
                  </span>
                )}
                <div className="flex items-center gap-3.5">
                  <Avatar initials={s.initials} gradient={s.avatarColor} size="lg" />
                  <div className="min-w-0">
                    <p className="text-[17px] font-semibold tracking-tight text-ink">
                      {s.name}
                    </p>
                    <p className="truncate text-[13px] text-ink-muted">{s.degree}</p>
                  </div>
                </div>

                <p className="mt-4 line-clamp-2 text-[14px] leading-snug text-ink-muted">
                  {s.headline}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {s.skills.slice(0, 3).map((sk) => (
                    <span key={sk} className="pill bg-granite-100 text-ink-soft">
                      {sk}
                    </span>
                  ))}
                  {s.skills.length > 3 && (
                    <span className="pill bg-granite-100 text-ink-faint">
                      +{s.skills.length - 3}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-granite-100 pt-3.5 text-[12.5px] text-ink-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-sea-500" />
                    {s.ukCity}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-sea-500" />
                    Class of {s.graduationYear}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-[14px] font-medium text-sea-600">
                  View portfolio ({s.projects.length})
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <StudentModal student={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
