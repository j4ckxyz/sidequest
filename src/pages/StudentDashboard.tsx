import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus,
  UploadCloud,
  FileText,
  Code2,
  Palette,
  Scale,
  FlaskConical,
  ExternalLink,
  Award,
  CheckCircle2,
  Wand2,
  CalendarClock,
  ArrowRight,
} from 'lucide-react'
import {
  bursaries,
  fields,
  internships,
  students,
  type Field,
  type Project,
} from '../data/mockData'
import Avatar from '../components/Avatar'
import { useToast } from '../components/Toast'

const kindIcon: Record<Project['kind'], typeof FileText> = {
  Dissertation: FileText,
  Codebase: Code2,
  Design: Palette,
  'Case Study': Scale,
  Research: FlaskConical,
}

// Demo user = the first featured student
const me = students[0]

export default function StudentDashboard({ goHub }: { goHub: () => void }) {
  const { notify } = useToast()
  const [degreeField, setDegreeField] = useState<Field>(me.field)
  const [visibility, setVisibility] = useState(true)

  const matched = useMemo(
    () =>
      bursaries.filter(
        (b) => b.field === 'Open to all' || b.field === degreeField,
      ),
    [degreeField],
  )

  const holidayMatches = internships.filter((i) => i.field === degreeField).slice(0, 2)

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      {/* Profile header */}
      <div className="card relative overflow-hidden p-7">
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-br ${me.avatarColor} opacity-[0.14]`}
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar initials={me.initials} gradient={me.avatarColor} size="xl" ring />
            <div className="pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[28px] font-semibold tracking-tight text-ink">
                  {me.name}
                </h1>
                <span className="pill bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Profile 92% complete
                </span>
              </div>
              <p className="mt-1 text-[15px] text-ink-muted">{me.headline}</p>
              <p className="mt-2 text-[13.5px] text-ink-faint">
                {me.degree} · {me.university} · Class of {me.graduationYear}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-granite-200 bg-granite-50 px-4 py-3">
            <div>
              <p className="text-[13px] font-medium text-ink">Discoverable by employers</p>
              <p className="text-[12px] text-ink-faint">
                {visibility ? 'Firms can find & contact you' : 'Hidden from search'}
              </p>
            </div>
            <button
              onClick={() => {
                setVisibility((v) => !v)
                notify(
                  !visibility ? 'You’re now discoverable' : 'Profile hidden',
                  !visibility
                    ? 'Jersey employers can find you in reverse search.'
                    : 'You won’t appear in employer search.',
                )
              }}
              role="switch"
              aria-checked={visibility}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                visibility ? 'bg-emerald-500' : 'bg-granite-300'
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  visibility ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        {/* LEFT: profile + showcase */}
        <div className="space-y-6">
          {/* About / seeking */}
          <div className="card p-6">
            <p className="section-label">My profile</p>
            <label className="mt-4 block text-[13px] font-medium text-ink-soft">
              What I’m looking for in Jersey
            </label>
            <textarea
              defaultValue={me.seeking}
              rows={3}
              className="field mt-1.5 resize-none"
            />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[13px] font-medium text-ink-soft">
                  Degree field
                </label>
                <select
                  value={degreeField}
                  onChange={(e) => setDegreeField(e.target.value as Field)}
                  className="field mt-1.5 cursor-pointer"
                >
                  {fields.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-ink-soft">
                  Graduation year
                </label>
                <select defaultValue={me.graduationYear} className="field mt-1.5 cursor-pointer">
                  {[2025, 2026, 2027, 2028].map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-[13px] font-medium text-ink-soft">Skills</p>
              <div className="flex flex-wrap gap-2">
                {me.skills.map((s) => (
                  <span key={s} className="pill bg-sea-50 text-sea-700">
                    {s}
                  </span>
                ))}
                <button
                  onClick={() => notify('Skill added', 'Add skills to sharpen your matches.')}
                  className="pill border border-dashed border-granite-300 text-ink-faint hover:border-sea-300 hover:text-sea-600"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Portfolio showcase */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="section-label">Showcase</p>
                <p className="mt-1 text-[14px] text-ink-muted">
                  Proof of what you can do — beyond a CV.
                </p>
              </div>
              <button
                onClick={() =>
                  notify('Upload started', 'Drop a PDF or paste a GitHub link.')
                }
                className="btn-ghost py-2 text-[13.5px]"
              >
                <UploadCloud className="h-4 w-4" /> Upload
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {me.projects.map((p) => {
                const Icon = kindIcon[p.kind]
                return (
                  <div
                    key={p.title}
                    className="group rounded-2xl border border-granite-200 bg-granite-50/60 p-4 transition hover:border-sea-300 hover:bg-white"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ink-soft shadow-soft">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-[15px] font-semibold text-ink">{p.title}</h4>
                          <span className="pill shrink-0 bg-white text-ink-muted">
                            {p.kind}
                          </span>
                        </div>
                        <p className="mt-1 text-[13.5px] leading-snug text-ink-muted">
                          {p.summary}
                        </p>
                        {p.link && (
                          <a
                            href={p.link}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-sea-600 hover:text-sea-800"
                          >
                            {p.linkLabel ?? 'View'} <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Upload dropzone */}
              <button
                onClick={() =>
                  notify('Dissertation summary uploaded', 'Employers can now view it.')
                }
                className="flex w-full flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-granite-200 bg-white py-7 text-center transition hover:border-sea-300 hover:bg-sea-50/40"
              >
                <UploadCloud className="h-6 w-6 text-ink-faint" />
                <span className="text-[14px] font-medium text-ink-soft">
                  Add a dissertation, project or GitHub link
                </span>
                <span className="text-[12.5px] text-ink-faint">
                  PDF, DOCX or URL · shown to employers who view your profile
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: matchmaker + holiday */}
        <div className="space-y-6">
          {/* Bursary matchmaker */}
          <div className="card overflow-hidden p-6">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-soft">
                <Wand2 className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-[16px] font-semibold text-ink">Bursary Matchmaker</p>
                <p className="text-[12.5px] text-ink-muted">
                  Filtered for <span className="font-medium text-ink-soft">{degreeField}</span>
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <AnimatePresence mode="popLayout">
                {matched.map((b) => (
                  <motion.div
                    key={b.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="rounded-2xl border border-granite-200 bg-white p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${b.logoColor} text-white shadow-soft`}
                      >
                        <Award className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                          {b.provider}
                        </p>
                        <h4 className="text-[15px] font-semibold leading-tight text-ink">
                          {b.title}
                        </h4>
                        <p className="mt-1 text-[15px] font-semibold text-emerald-600">
                          {b.amount}
                        </p>
                        <p className="mt-1.5 text-[13px] leading-snug text-ink-muted">
                          {b.summary}
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {b.perks.map((perk) => (
                            <span key={perk} className="pill bg-emerald-50 text-emerald-700">
                              {perk}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-[12px] text-ink-faint">
                            Deadline {b.deadline}
                          </span>
                          <button
                            onClick={() =>
                              notify(
                                `Applied to ${b.title}`,
                                `${b.provider} will review your profile.`,
                              )
                            }
                            className="btn-accent px-3.5 py-1.5 text-[13px]"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <p className="mt-3 text-center text-[12.5px] text-ink-faint">
              {matched.length} bursaries match your degree
            </p>
          </div>

          {/* Holiday matches */}
          <div className="card p-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 text-white shadow-soft">
                <CalendarClock className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-[16px] font-semibold text-ink">Holiday Hub picks</p>
                <p className="text-[12.5px] text-ink-muted">Short stints over the breaks</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {(holidayMatches.length ? holidayMatches : internships.slice(0, 2)).map((i) => (
                <div
                  key={i.id}
                  className="flex items-center gap-3 rounded-2xl border border-granite-200 bg-granite-50/60 p-3"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${i.logoColor} text-[13px] font-semibold text-white`}
                  >
                    {i.company.slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink">{i.role}</p>
                    <p className="text-[12px] text-ink-muted">
                      {i.company} · {i.window}
                    </p>
                  </div>
                  <span className="pill shrink-0 bg-white text-ink-muted">{i.type}</span>
                </div>
              ))}
            </div>
            <button
              onClick={goHub}
              className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-sea-600 hover:text-sea-800"
            >
              Open the Holiday Hub
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
