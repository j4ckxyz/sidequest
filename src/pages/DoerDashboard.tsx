import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus,
  X,
  Loader2,
  Save,
  Trophy,
  CheckCircle2,
  Coins,
  Sparkles,
  Swords,
  MessageCircle,
} from 'lucide-react'
import { parishes, skillSuggestions, gradientFor, initialsOf, rankFor } from '../lib/constants'
import type { Application, Doer, Quest } from '../lib/types'
import { getMyDoer, myApplications, updateDoer, applyToQuest } from '../lib/db'
import { useToast } from '../components/Toast'
import Avatar from '../components/Avatar'
import XPBar from '../components/XPBar'
import QuestModal from '../components/QuestModal'

export default function DoerDashboard({ meId, meName }: { meId: string; meName: string }) {
  const { notify } = useToast()
  const [doer, setDoer] = useState<Doer | null>(null)
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [d, a] = await Promise.all([getMyDoer(meId), myApplications(meId)])
        if (!alive) return
        setDoer(d)
        setApps(a)
      } catch (e) {
        notify('Could not load your profile', (e as Error).message)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [meId, notify])

  if (loading) {
    return (
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-5 py-32 text-ink-muted">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading your adventures…
      </div>
    )
  }
  if (!doer) {
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

  return <DoerInner doer={doer} setDoer={setDoer} apps={apps} meName={meName} notify={notify} />
}

function DoerInner({
  doer,
  setDoer,
  apps,
  meName,
  notify,
}: {
  doer: Doer
  setDoer: (d: Doer) => void
  apps: Application[]
  meName: string
  notify: (t: string, d?: string) => void
}) {
  const [form, setForm] = useState<Doer>(doer)
  const [saving, setSaving] = useState(false)
  const [skillDraft, setSkillDraft] = useState('')
  const [selected, setSelected] = useState<Quest | null>(null)

  const editable = ({ xp: _x, quests_done: _q, created_at: _c, updated_at: _u, ...r }: Doer) =>
    JSON.stringify(r)
  const dirty = editable(form) !== editable(doer)

  const set = <K extends keyof Doer>(k: K, v: Doer[K]) => setForm((f) => ({ ...f, [k]: v }))

  async function save() {
    setSaving(true)
    try {
      await updateDoer(doer.id, form)
      setDoer({ ...doer, ...form })
      notify('Profile saved', 'Your adventurer profile is up to date.')
    } catch (e) {
      notify('Could not save', (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function addSkill(s: string) {
    const v = s.trim()
    if (!v || form.skills.includes(v)) return
    set('skills', [...form.skills, v])
    setSkillDraft('')
  }

  const { current } = rankFor(form.xp)
  const active = apps.filter((a) => a.status === 'accepted')
  const pending = apps.filter((a) => a.status === 'applied')

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      {/* Hero card with XP */}
      <div className="card relative overflow-hidden p-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-jersey-500 to-jersey-700 opacity-[0.12]" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar initials={initialsOf(form.name)} gradient={gradientFor(doer.id)} size="xl" ring />
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-white text-[16px] shadow-soft">
                {current.emoji}
              </span>
            </div>
            <div>
              <h1 className="text-[26px] font-semibold tracking-tight text-ink">
                {form.name || 'Your name'}
              </h1>
              <p className="text-[13.5px] text-ink-muted">
                {form.parish ? `${form.parish} Guild` : 'Set your parish'}
              </p>
            </div>
          </div>
          <div className="flex-1 sm:pl-4">
            <XPBar xp={form.xp} size="md" />
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-3">
          <MiniStat icon={Sparkles} tint="text-jersey-600" label="Total XP" value={form.xp.toLocaleString()} />
          <MiniStat icon={Trophy} tint="text-gold-600" label="Quests done" value={String(form.quests_done)} />
          <MiniStat icon={Swords} tint="text-ink" label="Active" value={String(active.length)} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Profile editor */}
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="section-label">My adventurer profile</p>
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
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save</>}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <L label="Name">
              <input className="field" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </L>
            <L label="Home parish">
              <select
                className="field cursor-pointer"
                value={form.parish}
                onChange={(e) => set('parish', e.target.value)}
              >
                <option value="">Select…</option>
                {parishes.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </L>
          </div>

          <div className="mt-4">
            <L label="About me">
              <textarea
                rows={3}
                className="field resize-none"
                value={form.bio}
                onChange={(e) => set('bio', e.target.value)}
                placeholder="A line or two — what you’re good at, what you enjoy helping with."
              />
            </L>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[13px] font-medium text-ink-soft">My skills</p>
            <div className="flex flex-wrap gap-2">
              {form.skills.map((s) => (
                <span key={s} className="pill bg-jersey-50 text-jersey-700">
                  {s}
                  <button
                    onClick={() => set('skills', form.skills.filter((x) => x !== s))}
                    className="ml-0.5 text-jersey-400 hover:text-jersey-700"
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
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill(skillDraft))}
                  placeholder="Add skill"
                  className="w-24 bg-transparent text-[13px] outline-none placeholder:text-ink-faint"
                />
                <button
                  onClick={() => addSkill(skillDraft)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-ink-faint hover:text-jersey-600"
                  aria-label="Add skill"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
            {form.skills.length === 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {skillSuggestions.slice(0, 6).map((s) => (
                  <button
                    key={s}
                    onClick={() => addSkill(s)}
                    className="rounded-full bg-granite-100 px-2.5 py-1 text-[12px] text-ink-muted transition hover:bg-granite-200"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* My Adventures */}
        <div className="space-y-6">
          <AdventureList
            title="On the party"
            emptyText="No active quests yet. Accept a quest from the board to get going."
            apps={active}
            onOpen={(q) => setSelected(q)}
            accent
          />
          <AdventureList
            title="Awaiting reply"
            emptyText="Nothing pending — browse the Quest Board and apply."
            apps={pending}
            onOpen={(q) => setSelected(q)}
          />
        </div>
      </div>

      {selected && (
        <QuestModal
          quest={selected}
          me={{ id: doer.id, name: meName || form.name, role: 'doer' }}
          applied
          onApply={async (msg) => {
            await applyToQuest(selected.id, doer.id, msg)
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function AdventureList({
  title,
  emptyText,
  apps,
  onOpen,
  accent,
}: {
  title: string
  emptyText: string
  apps: Application[]
  onOpen: (q: Quest) => void
  accent?: boolean
}) {
  return (
    <div className="card p-5">
      <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
        {accent ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <MessageCircle className="h-4 w-4" />}
        {title}
        <span className="rounded-full bg-granite-100 px-2 text-[11px] text-ink-muted">{apps.length}</span>
      </p>
      {apps.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-granite-200 bg-granite-50/50 px-4 py-6 text-center text-[13px] text-ink-muted">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-2.5">
          {apps.map((a) => {
            const q = a.quest
            if (!q) return null
            return (
              <button
                key={a.id}
                onClick={() => onOpen(q)}
                className="flex w-full items-center gap-3 rounded-2xl border border-granite-200 bg-white p-3 text-left transition hover:border-jersey-200 hover:shadow-soft"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-jersey-500 to-jersey-700 text-white">
                  <Coins className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink">{q.title}</p>
                  <p className="truncate text-[12px] text-ink-muted">
                    {q.poster?.name ?? 'A local'} · {q.parish} · £{q.reward}
                  </p>
                </div>
                <span className="pill shrink-0 bg-jersey-50 text-jersey-700">
                  <MessageCircle className="h-3.5 w-3.5" /> Chat
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MiniStat({
  icon: Icon,
  tint,
  label,
  value,
}: {
  icon: typeof Trophy
  tint: string
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-granite-200 bg-granite-50/60 px-3 py-3 text-center">
      <Icon className={`mx-auto mb-1 h-4.5 w-4.5 ${tint}`} />
      <div className="text-[19px] font-bold tracking-tight text-ink">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</div>
    </div>
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
