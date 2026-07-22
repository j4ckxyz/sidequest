import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus,
  X,
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
  Loader2,
  Trash2,
  Mail,
  Save,
} from 'lucide-react'
import { fields, projectKinds, gradientFor, initialsOf } from '../lib/constants'
import type {
  Bursary,
  Employer,
  Field,
  Opportunity,
  Project,
  ProjectKind,
  Student,
} from '../lib/types'
import {
  addProject,
  apply,
  deleteProject,
  employersByIds,
  getMyStudent,
  incomingInterviewRequests,
  listBursaries,
  listOpportunities,
  myApplications,
  updateStudent,
} from '../lib/db'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Avatar from '../components/Avatar'

const kindIcon: Record<ProjectKind, typeof FileText> = {
  Dissertation: FileText,
  Codebase: Code2,
  Design: Palette,
  'Case Study': Scale,
  Research: FlaskConical,
}

export default function StudentDashboard({ goHub }: { goHub: () => void }) {
  const { session } = useAuth()
  const { notify } = useToast()
  const userId = session!.user.id

  const [student, setStudent] = useState<Student | null>(null)
  const [bursaries, setBursaries] = useState<Bursary[]>([])
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [requesters, setRequesters] = useState<Employer[]>([])
  const [appliedOpps, setAppliedOpps] = useState<Set<string>>(new Set())
  const [appliedBurs, setAppliedBurs] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [me, b, o, reqs, apps] = await Promise.all([
          getMyStudent(userId),
          listBursaries(),
          listOpportunities(),
          incomingInterviewRequests(userId),
          myApplications(userId),
        ])
        if (!alive) return
        setStudent(me)
        setBursaries(b)
        setOpps(o)
        setAppliedOpps(
          new Set(apps.filter((a) => a.opportunity_id).map((a) => a.opportunity_id!)),
        )
        setAppliedBurs(new Set(apps.filter((a) => a.bursary_id).map((a) => a.bursary_id!)))
        const emps = await employersByIds([...new Set(reqs.map((r) => r.employer_id))])
        if (alive) setRequesters(emps)
      } catch (e) {
        notify('Could not load your dashboard', (e as Error).message)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [userId, notify])

  if (loading) {
    return (
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-5 py-32 text-ink-muted">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading your dashboard…
      </div>
    )
  }

  if (!student) {
    return (
      <div className="mx-auto max-w-md px-5 py-32 text-center">
        <p className="text-[17px] font-semibold text-ink">We couldn’t find your profile.</p>
        <p className="mt-1 text-[14px] text-ink-muted">
          If you just signed up, give it a moment and refresh. Otherwise the database
          migration may not have run yet.
        </p>
      </div>
    )
  }

  return (
    <DashboardInner
      student={student}
      setStudent={setStudent}
      bursaries={bursaries}
      opps={opps}
      requesters={requesters}
      appliedOpps={appliedOpps}
      setAppliedOpps={setAppliedOpps}
      appliedBurs={appliedBurs}
      setAppliedBurs={setAppliedBurs}
      goHub={goHub}
      notify={notify}
    />
  )
}

function DashboardInner({
  student,
  setStudent,
  bursaries,
  opps,
  requesters,
  appliedOpps,
  setAppliedOpps,
  appliedBurs,
  setAppliedBurs,
  goHub,
  notify,
}: {
  student: Student
  setStudent: (s: Student) => void
  bursaries: Bursary[]
  opps: Opportunity[]
  requesters: Employer[]
  appliedOpps: Set<string>
  setAppliedOpps: (s: Set<string>) => void
  appliedBurs: Set<string>
  setAppliedBurs: (s: Set<string>) => void
  goHub: () => void
  notify: (t: string, d?: string) => void
}) {
  const [form, setForm] = useState<Student>(student)
  const [saving, setSaving] = useState(false)
  const [skillDraft, setSkillDraft] = useState('')
  // Compare only editable fields — projects and timestamps change independently.
  const editable = ({ projects: _p, created_at: _c, updated_at: _u, ...rest }: Student) =>
    JSON.stringify(rest)
  const dirty = editable(form) !== editable(student)

  const set = <K extends keyof Student>(k: K, v: Student[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  async function save() {
    setSaving(true)
    try {
      await updateStudent(student.id, form)
      // Preserve the latest projects list (managed separately in ShowcaseCard).
      setStudent({ ...form, projects: student.projects })
      notify('Profile saved', 'Your changes are live to employers.')
    } catch (e) {
      notify('Could not save', (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleDiscoverable() {
    const next = !form.discoverable
    set('discoverable', next)
    try {
      await updateStudent(student.id, { discoverable: next })
      setStudent({ ...student, discoverable: next })
      notify(
        next ? 'You’re now discoverable' : 'Profile hidden',
        next
          ? 'Jersey employers can find you in reverse search.'
          : 'You won’t appear in employer search.',
      )
    } catch (e) {
      set('discoverable', !next)
      notify('Could not update', (e as Error).message)
    }
  }

  function addSkill() {
    const s = skillDraft.trim()
    if (!s || form.skills.includes(s)) return
    set('skills', [...form.skills, s])
    setSkillDraft('')
  }

  const matched = useMemo(
    () =>
      bursaries.filter(
        (b) => b.field === 'Open to all' || !b.field || b.field === form.field,
      ),
    [bursaries, form.field],
  )
  const holidayMatches = useMemo(() => {
    const mine = opps.filter((o) => o.field === form.field)
    return (mine.length ? mine : opps).slice(0, 3)
  }, [opps, form.field])

  const completion = useMemo(
    () => computeCompletion({ ...form, projects: student.projects }),
    [form, student.projects],
  )

  async function onApply(target: { opportunity_id?: string; bursary_id?: string }, label: string) {
    if (target.opportunity_id) setAppliedOpps(new Set(appliedOpps).add(target.opportunity_id))
    if (target.bursary_id) setAppliedBurs(new Set(appliedBurs).add(target.bursary_id))
    try {
      await apply(student.id, target)
      notify(`Applied to ${label}`, 'The provider can see your application.')
    } catch (e) {
      notify('Could not apply', (e as Error).message)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      {/* Header */}
      <div className="card relative overflow-hidden p-7">
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-br ${gradientFor(
            student.id,
          )} opacity-[0.14]`}
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar
              initials={initialsOf(form.name)}
              gradient={gradientFor(student.id)}
              size="xl"
              ring
            />
            <div className="pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[28px] font-semibold tracking-tight text-ink">
                  {form.name || 'Your name'}
                </h1>
                <span className="pill bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Profile {completion}% complete
                </span>
              </div>
              <p className="mt-1 text-[15px] text-ink-muted">
                {form.headline || 'Add a headline to stand out'}
              </p>
              <p className="mt-2 text-[13.5px] text-ink-faint">
                {[form.degree, form.university, form.graduation_year && `Class of ${form.graduation_year}`]
                  .filter(Boolean)
                  .join(' · ') || 'Complete your details below'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-granite-200 bg-granite-50 px-4 py-3">
            <div>
              <p className="text-[13px] font-medium text-ink">Discoverable by employers</p>
              <p className="text-[12px] text-ink-faint">
                {form.discoverable ? 'Firms can find & contact you' : 'Hidden from search'}
              </p>
            </div>
            <button
              onClick={toggleDiscoverable}
              role="switch"
              aria-checked={form.discoverable}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                form.discoverable ? 'bg-emerald-500' : 'bg-granite-300'
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  form.discoverable ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Incoming interview requests */}
        {requesters.length > 0 && (
          <div className="relative mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-sea-200 bg-sea-50/70 px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sea-600 text-white">
              <Mail className="h-4.5 w-4.5" />
            </span>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-ink">
                {requesters.length} {requesters.length === 1 ? 'firm wants' : 'firms want'} to
                interview you
              </p>
              <p className="text-[12.5px] text-ink-muted">
                {requesters.map((e) => e.company).join(' · ')}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        {/* LEFT */}
        <div className="space-y-6">
          {/* Profile editor */}
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="section-label">My profile</p>
              <AnimatePresence>
                {dirty && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={save}
                    disabled={saving}
                    className="btn-accent px-4 py-2 text-[13.5px]"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> Save changes
                      </>
                    )}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <L label="Full name">
                <input className="field" value={form.name} onChange={(e) => set('name', e.target.value)} />
              </L>
              <L label="Headline">
                <input
                  className="field"
                  value={form.headline}
                  onChange={(e) => set('headline', e.target.value)}
                  placeholder="e.g. Full-stack engineer building for the CI"
                />
              </L>
              <L label="Degree">
                <input
                  className="field"
                  value={form.degree}
                  onChange={(e) => set('degree', e.target.value)}
                  placeholder="e.g. BSc Computer Science"
                />
              </L>
              <L label="Degree field">
                <select
                  className="field cursor-pointer"
                  value={form.field ?? ''}
                  onChange={(e) => set('field', (e.target.value || null) as Field | null)}
                >
                  <option value="">Select…</option>
                  {fields.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </L>
              <L label="University">
                <input
                  className="field"
                  value={form.university}
                  onChange={(e) => set('university', e.target.value)}
                  placeholder="e.g. University of Bristol"
                />
              </L>
              <L label="UK city">
                <input
                  className="field"
                  value={form.uk_city}
                  onChange={(e) => set('uk_city', e.target.value)}
                  placeholder="e.g. Bristol"
                />
              </L>
              <L label="Graduation year">
                <select
                  className="field cursor-pointer"
                  value={form.graduation_year ?? ''}
                  onChange={(e) =>
                    set('graduation_year', e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">Select…</option>
                  {[2025, 2026, 2027, 2028, 2029].map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </L>
              <L label="Predicted grade">
                <input
                  className="field"
                  value={form.gpa}
                  onChange={(e) => set('gpa', e.target.value)}
                  placeholder="e.g. First Class (predicted)"
                />
              </L>
            </div>

            <div className="mt-4">
              <L label="What I’m looking for in Jersey">
                <textarea
                  rows={2}
                  className="field resize-none"
                  value={form.seeking}
                  onChange={(e) => set('seeking', e.target.value)}
                  placeholder="e.g. Graduate software role with a Jersey fintech"
                />
              </L>
            </div>
            <div className="mt-4">
              <L label="About me">
                <textarea
                  rows={3}
                  className="field resize-none"
                  value={form.bio}
                  onChange={(e) => set('bio', e.target.value)}
                  placeholder="A couple of sentences on who you are and what drives you."
                />
              </L>
            </div>
            <div className="mt-4">
              <L label="Availability">
                <input
                  className="field"
                  value={form.availability}
                  onChange={(e) => set('availability', e.target.value)}
                  placeholder="e.g. Graduating July 2025 · available immediately"
                />
              </L>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[13px] font-medium text-ink-soft">Skills</p>
              <div className="flex flex-wrap gap-2">
                {form.skills.map((s) => (
                  <span key={s} className="pill bg-sea-50 text-sea-700">
                    {s}
                    <button
                      onClick={() => set('skills', form.skills.filter((x) => x !== s))}
                      className="ml-0.5 text-sea-400 hover:text-sea-700"
                      aria-label={`Remove ${s}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-granite-300 pl-3 pr-1 py-0.5">
                  <input
                    value={skillDraft}
                    onChange={(e) => setSkillDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="Add skill"
                    className="w-24 bg-transparent text-[13px] outline-none placeholder:text-ink-faint"
                  />
                  <button
                    onClick={addSkill}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-ink-faint hover:text-sea-600"
                    aria-label="Add skill"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            </div>
          </div>

          {/* Showcase */}
          <ShowcaseCard student={student} setStudent={setStudent} notify={notify} />
        </div>

        {/* RIGHT */}
        <div className="space-y-6">
          {/* Matchmaker */}
          <div className="card overflow-hidden p-6">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-soft">
                <Wand2 className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-[16px] font-semibold text-ink">Bursary Matchmaker</p>
                <p className="text-[12.5px] text-ink-muted">
                  {form.field ? (
                    <>Filtered for <span className="font-medium text-ink-soft">{form.field}</span></>
                  ) : (
                    'Set your degree field to filter'
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {bursaries.length === 0 ? (
                <EmptyHint>
                  No bursaries yet. When Jersey firms and the Government post them, your
                  matches appear here.
                </EmptyHint>
              ) : matched.length === 0 ? (
                <EmptyHint>No bursaries match your field yet — check back soon.</EmptyHint>
              ) : (
                <AnimatePresence mode="popLayout">
                  {matched.map((b) => (
                    <motion.div
                      key={b.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="rounded-2xl border border-granite-200 bg-white p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradientFor(
                            b.provider,
                          )} text-white shadow-soft`}
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
                          {b.amount && (
                            <p className="mt-1 text-[15px] font-semibold text-emerald-600">
                              {b.amount}
                            </p>
                          )}
                          {b.summary && (
                            <p className="mt-1.5 text-[13px] leading-snug text-ink-muted">
                              {b.summary}
                            </p>
                          )}
                          {b.perks.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {b.perks.map((perk) => (
                                <span key={perk} className="pill bg-emerald-50 text-emerald-700">
                                  {perk}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-[12px] text-ink-faint">
                              {b.deadline ? `Deadline ${b.deadline}` : 'Rolling'}
                            </span>
                            <button
                              onClick={() => onApply({ bursary_id: b.id }, b.title)}
                              disabled={appliedBurs.has(b.id)}
                              className={`px-3.5 py-1.5 text-[13px] ${
                                appliedBurs.has(b.id) ? 'btn bg-emerald-500 text-white' : 'btn-accent'
                              }`}
                            >
                              {appliedBurs.has(b.id) ? 'Applied' : 'Apply'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Holiday picks */}
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
            {opps.length === 0 ? (
              <EmptyHint>
                No opportunities posted yet. Employers add shadowing days and projects here.
              </EmptyHint>
            ) : (
              <div className="space-y-2.5">
                {holidayMatches.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center gap-3 rounded-2xl border border-granite-200 bg-granite-50/60 p-3"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradientFor(
                        o.company,
                      )} text-[13px] font-semibold text-white`}
                    >
                      {o.company.slice(0, 2)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-ink">{o.role}</p>
                      <p className="truncate text-[12px] text-ink-muted">
                        {o.company}
                        {o.window ? ` · ${o.window}` : ''}
                      </p>
                    </div>
                    <span className="pill shrink-0 bg-white text-ink-muted">{o.type}</span>
                  </div>
                ))}
              </div>
            )}
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

// ── Showcase (projects) ──────────────────────────────────────────────────────

function ShowcaseCard({
  student,
  setStudent,
  notify,
}: {
  student: Student
  setStudent: (s: Student) => void
  notify: (t: string, d?: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const projects = student.projects ?? []

  async function remove(p: Project) {
    try {
      await deleteProject(p.id)
      setStudent({ ...student, projects: projects.filter((x) => x.id !== p.id) })
      notify('Project removed')
    } catch (e) {
      notify('Could not remove', (e as Error).message)
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-label">Showcase</p>
          <p className="mt-1 text-[14px] text-ink-muted">
            Proof of what you can do — beyond a CV.
          </p>
        </div>
        <button onClick={() => setAdding((v) => !v)} className="btn-ghost py-2 text-[13.5px]">
          <Plus className="h-4 w-4" /> Add work
        </button>
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <ProjectForm
              studentId={student.id}
              onDone={(created) => {
                setStudent({ ...student, projects: [...projects, created] })
                setAdding(false)
                notify('Project added', 'Employers viewing your profile can see it.')
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 space-y-3">
        {projects.length === 0 && !adding ? (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-granite-200 bg-white py-8 text-center transition hover:border-sea-300 hover:bg-sea-50/40"
          >
            <FileText className="h-6 w-6 text-ink-faint" />
            <span className="text-[14px] font-medium text-ink-soft">
              Add a dissertation, project or GitHub link
            </span>
            <span className="text-[12.5px] text-ink-faint">
              Shown to employers who view your profile
            </span>
          </button>
        ) : (
          projects.map((p) => {
            const Icon = kindIcon[p.kind] ?? FileText
            return (
              <div
                key={p.id}
                className="group rounded-2xl border border-granite-200 bg-granite-50/60 p-4 transition hover:border-sea-300 hover:bg-white"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ink-soft shadow-soft">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-[15px] font-semibold text-ink">{p.title}</h4>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="pill bg-white text-ink-muted">{p.kind}</span>
                        <button
                          onClick={() => remove(p)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint transition hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Remove project"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {p.summary && (
                      <p className="mt-1 text-[13.5px] leading-snug text-ink-muted">
                        {p.summary}
                      </p>
                    )}
                    {p.link && (
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-sea-600 hover:text-sea-800"
                      >
                        {p.link_label ?? 'View'} <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function ProjectForm({
  studentId,
  onDone,
}: {
  studentId: string
  onDone: (p: Project) => void
}) {
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<ProjectKind>('Codebase')
  const [summary, setSummary] = useState('')
  const [link, setLink] = useState('')
  const [tags, setTags] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    try {
      const created = await addProject({
        student_id: studentId,
        title: title.trim(),
        kind,
        summary: summary.trim(),
        link: link.trim() || null,
        link_label: link.trim() ? 'View' : null,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      })
      onDone(created)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl border border-granite-200 bg-granite-50/60 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <input
          className="field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Project title"
        />
        <select
          className="field cursor-pointer sm:w-40"
          value={kind}
          onChange={(e) => setKind(e.target.value as ProjectKind)}
        >
          {projectKinds.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </div>
      <textarea
        rows={2}
        className="field resize-none"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="One or two lines on what it is and the outcome."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          className="field"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Link (GitHub, PDF, Behance…)"
        />
        <input
          className="field"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Tags, comma-separated"
        />
      </div>
      <button type="submit" disabled={busy} className="btn-accent w-full py-2.5 text-[14px]">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add to showcase'}
      </button>
    </form>
  )
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  )
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-granite-200 bg-granite-50/50 px-4 py-6 text-center text-[13px] text-ink-muted">
      {children}
    </p>
  )
}

function computeCompletion(s: Student): number {
  const checks = [
    s.name,
    s.headline,
    s.degree,
    s.field,
    s.university,
    s.uk_city,
    s.graduation_year,
    s.seeking,
    s.bio,
    s.skills.length > 0,
    (s.projects?.length ?? 0) > 0,
  ]
  const done = checks.filter(Boolean).length
  return Math.round((done / checks.length) * 100)
}
