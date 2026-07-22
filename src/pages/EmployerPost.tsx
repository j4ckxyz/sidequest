import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarHeart, Award, Plus, Trash2, Loader2, Inbox } from 'lucide-react'
import { fields, opportunityTypes, gradientFor } from '../lib/constants'
import type { Bursary, Field, Opportunity, OpportunityType } from '../lib/types'
import {
  createBursary,
  createOpportunity,
  deleteBursary,
  deleteOpportunity,
  myBursaries,
  myInterviewRequests,
  myOpportunities,
} from '../lib/db'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

type Tab = 'opportunity' | 'bursary'

export default function EmployerPost({ company }: { company: string }) {
  const { session } = useAuth()
  const { notify } = useToast()
  const userId = session!.user.id

  const [tab, setTab] = useState<Tab>('opportunity')
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [burs, setBurs] = useState<Bursary[]>([])
  const [requestCount, setRequestCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      myOpportunities(userId),
      myBursaries(userId),
      myInterviewRequests(userId),
    ])
      .then(([o, b, r]) => {
        if (!alive) return
        setOpps(o)
        setBurs(b)
        setRequestCount(r.length)
      })
      .catch((e) => notify('Could not load your posts', e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [userId, notify])

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8">
        <span className="pill bg-ink text-white">
          <CalendarHeart className="h-3.5 w-3.5" /> Post & manage
        </span>
        <h1 className="mt-3 text-[34px] font-semibold tracking-tight text-ink sm:text-[42px]">
          Put {company} in front of talent.
        </h1>
        <p className="mt-1.5 max-w-xl text-[16px] text-ink-muted">
          Post Holiday Hub opportunities and bursaries. Students see them the moment you
          publish.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Composer */}
        <div className="card p-6">
          <div className="mb-5 inline-flex rounded-full bg-granite-100 p-1">
            <button
              onClick={() => setTab('opportunity')}
              className={`rounded-full px-4 py-2 text-[13.5px] font-medium transition ${
                tab === 'opportunity' ? 'bg-white text-ink shadow-soft' : 'text-ink-muted'
              }`}
            >
              Holiday Hub slot
            </button>
            <button
              onClick={() => setTab('bursary')}
              className={`rounded-full px-4 py-2 text-[13.5px] font-medium transition ${
                tab === 'bursary' ? 'bg-white text-ink shadow-soft' : 'text-ink-muted'
              }`}
            >
              Bursary
            </button>
          </div>

          {tab === 'opportunity' ? (
            <OpportunityForm
              company={company}
              onCreate={async (draft) => {
                const created = await createOpportunity({ ...draft, employer_id: userId })
                setOpps((prev) => [created, ...prev])
                notify('Opportunity published', 'Students can see it in the Holiday Hub.')
              }}
            />
          ) : (
            <BursaryForm
              company={company}
              onCreate={async (draft) => {
                const created = await createBursary({ ...draft, employer_id: userId })
                setBurs((prev) => [created, ...prev])
                notify('Bursary published', 'It now appears in students’ Matchmaker.')
              }}
            />
          )}
        </div>

        {/* Right column: stats + posts */}
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Opportunities" value={opps.length} tint="text-amber-600" />
            <Stat label="Bursaries" value={burs.length} tint="text-emerald-600" />
            <Stat label="Interview requests" value={requestCount} tint="text-sea-600" />
          </div>

          <div className="card p-6">
            <p className="section-label mb-3">Your live posts</p>
            {loading ? (
              <div className="flex items-center gap-2 py-8 text-ink-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : opps.length + burs.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 py-10 text-center">
                <Inbox className="h-8 w-8 text-ink-faint" />
                <p className="text-[15px] font-medium text-ink">Nothing posted yet</p>
                <p className="text-[13px] text-ink-muted">
                  Publish your first opportunity or bursary on the left.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <AnimatePresence mode="popLayout">
                  {opps.map((o) => (
                    <PostRow
                      key={o.id}
                      icon={CalendarHeart}
                      seed={o.company}
                      title={o.role}
                      subtitle={`${o.type} · ${o.window || 'flexible'}`}
                      onDelete={async () => {
                        await deleteOpportunity(o.id)
                        setOpps((p) => p.filter((x) => x.id !== o.id))
                        notify('Opportunity removed')
                      }}
                    />
                  ))}
                  {burs.map((b) => (
                    <PostRow
                      key={b.id}
                      icon={Award}
                      seed={b.provider}
                      title={b.title}
                      subtitle={`${b.amount || 'Bursary'} · ${b.field ?? 'Open to all'}`}
                      onDelete={async () => {
                        await deleteBursary(b.id)
                        setBurs((p) => p.filter((x) => x.id !== b.id))
                        notify('Bursary removed')
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <div className="card px-3 py-4 text-center">
      <div className={`text-[26px] font-semibold ${tint}`}>{value}</div>
      <div className="mt-0.5 text-[11.5px] leading-tight text-ink-muted">{label}</div>
    </div>
  )
}

function PostRow({
  icon: Icon,
  seed,
  title,
  subtitle,
  onDelete,
}: {
  icon: typeof Award
  seed: string
  title: string
  subtitle: string
  onDelete: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="flex items-center gap-3 rounded-2xl border border-granite-200 bg-granite-50/60 p-3"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradientFor(
          seed,
        )} text-white`}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-ink">{title}</p>
        <p className="truncate text-[12px] text-ink-muted">{subtitle}</p>
      </div>
      <button
        onClick={async () => {
          setBusy(true)
          try {
            await onDelete()
          } finally {
            setBusy(false)
          }
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-faint transition hover:bg-rose-50 hover:text-rose-600"
        aria-label="Delete"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </motion.div>
  )
}

// ── Opportunity form ─────────────────────────────────────────────────────────

function OpportunityForm({
  company,
  onCreate,
}: {
  company: string
  onCreate: (d: Omit<Opportunity, 'id' | 'created_at' | 'employer_id'>) => Promise<void>
}) {
  const [role, setRole] = useState('')
  const [type, setType] = useState<OpportunityType>('1-day Shadow')
  const [field, setField] = useState<Field>('Digital & Tech')
  const [location, setLocation] = useState('')
  const [window, setWindow] = useState('')
  const [paid, setPaid] = useState('')
  const [spots, setSpots] = useState(1)
  const [summary, setSummary] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!role.trim()) return
    setBusy(true)
    try {
      await onCreate({
        company,
        role: role.trim(),
        type,
        field,
        location: location.trim(),
        window: window.trim(),
        paid: paid.trim(),
        spots,
        summary: summary.trim(),
      })
      setRole('')
      setLocation('')
      setWindow('')
      setPaid('')
      setSpots(1)
      setSummary('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field2 label="Role title">
        <input
          className="field"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Cloud Engineering — 2-week Agile Sprint"
        />
      </Field2>
      <div className="grid grid-cols-2 gap-3">
        <Field2 label="Type">
          <select
            className="field cursor-pointer"
            value={type}
            onChange={(e) => setType(e.target.value as OpportunityType)}
          >
            {opportunityTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field2>
        <Field2 label="Field">
          <select
            className="field cursor-pointer"
            value={field}
            onChange={(e) => setField(e.target.value as Field)}
          >
            {fields.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field2 label="Location">
          <input
            className="field"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. St Helier · hybrid"
          />
        </Field2>
        <Field2 label="When">
          <input
            className="field"
            value={window}
            onChange={(e) => setWindow(e.target.value)}
            placeholder="e.g. Christmas break · 22 Dec"
          />
        </Field2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field2 label="Pay / expenses">
          <input
            className="field"
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
            placeholder="e.g. £450 / week"
          />
        </Field2>
        <Field2 label="Spots">
          <input
            type="number"
            min={1}
            className="field"
            value={spots}
            onChange={(e) => setSpots(Math.max(1, Number(e.target.value)))}
          />
        </Field2>
      </div>
      <Field2 label="Summary">
        <textarea
          rows={3}
          className="field resize-none"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="What will the student actually do?"
        />
      </Field2>
      <button type="submit" disabled={busy} className="btn-accent w-full py-3 text-[15px]">
        {busy ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <><Plus className="h-4 w-4" /> Publish opportunity</>}
      </button>
    </form>
  )
}

// ── Bursary form ─────────────────────────────────────────────────────────────

function BursaryForm({
  company,
  onCreate,
}: {
  company: string
  onCreate: (d: Omit<Bursary, 'id' | 'created_at' | 'employer_id'>) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [field, setField] = useState<Field | 'Open to all'>('Open to all')
  const [deadline, setDeadline] = useState('')
  const [commitment, setCommitment] = useState('')
  const [degrees, setDegrees] = useState('')
  const [perks, setPerks] = useState('')
  const [summary, setSummary] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    try {
      await onCreate({
        provider: company,
        title: title.trim(),
        amount: amount.trim(),
        field,
        degrees: degrees.split(',').map((d) => d.trim()).filter(Boolean),
        deadline: deadline.trim(),
        commitment: commitment.trim(),
        summary: summary.trim(),
        perks: perks.split(',').map((p) => p.trim()).filter(Boolean),
      })
      setTitle('')
      setAmount('')
      setDeadline('')
      setCommitment('')
      setDegrees('')
      setPerks('')
      setSummary('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field2 label="Bursary title">
        <input
          className="field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Future Finance Bursary"
        />
      </Field2>
      <div className="grid grid-cols-2 gap-3">
        <Field2 label="Amount">
          <input
            className="field"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. £3,500 / year"
          />
        </Field2>
        <Field2 label="Eligible field">
          <select
            className="field cursor-pointer"
            value={field}
            onChange={(e) => setField(e.target.value as Field | 'Open to all')}
          >
            <option>Open to all</option>
            {fields.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field2>
      </div>
      <Field2 label="Eligible degrees (comma-separated)">
        <input
          className="field"
          value={degrees}
          onChange={(e) => setDegrees(e.target.value)}
          placeholder="e.g. Economics, Finance, Mathematics"
        />
      </Field2>
      <div className="grid grid-cols-2 gap-3">
        <Field2 label="Deadline">
          <input
            className="field"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            placeholder="e.g. 30 Nov 2026"
          />
        </Field2>
        <Field2 label="Commitment">
          <input
            className="field"
            value={commitment}
            onChange={(e) => setCommitment(e.target.value)}
            placeholder="e.g. One insight week / year"
          />
        </Field2>
      </div>
      <Field2 label="Perks (comma-separated)">
        <input
          className="field"
          value={perks}
          onChange={(e) => setPerks(e.target.value)}
          placeholder="e.g. Paid placement, Industry mentor"
        />
      </Field2>
      <Field2 label="Summary">
        <textarea
          rows={3}
          className="field resize-none"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Who is this for and what does it offer?"
        />
      </Field2>
      <button type="submit" disabled={busy} className="btn-accent w-full py-3 text-[15px]">
        {busy ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <><Plus className="h-4 w-4" /> Publish bursary</>}
      </button>
    </form>
  )
}

function Field2({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  )
}
