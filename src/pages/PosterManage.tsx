import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Loader2,
  Users,
  Coins,
  Sparkles,
  Trash2,
  Check,
  X,
  MessageCircle,
  PartyPopper,
  Inbox,
  Repeat,
  CalendarDays,
  History,
  ClipboardList,
  Swords,
} from 'lucide-react'
import { gradientFor, initialsOf, iconForCategory } from '../lib/constants'
import type { Application, Quest, WeekLog } from '../lib/types'
import {
  archiveQuest,
  completeQuest,
  deleteQuest,
  getProfile,
  logWeek,
  myApplications,
  myQuests,
  questApplications,
  questWeekLogs,
  setApplicationStatus,
  unlogWeek,
} from '../lib/db'
import { useToast } from '../components/Toast'
import { useChatNav } from '../context/ChatContext'
import Avatar from '../components/Avatar'
import QuestModal from '../components/QuestModal'

type Tab = 'single' | 'weekly' | 'history'
type Scope = 'posted' | 'doing'

// ── Week helpers (Monday-based ISO date strings) ─────────────────────────────
function mondayOf(d: Date): Date {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7 // 0 = Monday
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}
function lastNWeeks(n: number): { iso: string; label: string }[] {
  const base = mondayOf(new Date())
  const out: { iso: string; label: string }[] = []
  for (let i = 0; i < n; i++) {
    const w = new Date(base)
    w.setDate(base.getDate() - i * 7)
    out.push({ iso: isoDate(w), label: w.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) })
  }
  return out.reverse()
}

export default function PosterManage({ meId, meName }: { meId: string; meName: string }) {
  const { notify } = useToast()
  const [posterName, setPosterName] = useState(meName)
  const [posterMeta, setPosterMeta] = useState('')
  const [quests, setQuests] = useState<Quest[]>([])
  const [doingApps, setDoingApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState<Scope>('posted')
  const [tab, setTab] = useState<Tab>('single')
  const [selected, setSelected] = useState<Quest | null>(null)
  const [selectedDoing, setSelectedDoing] = useState<Quest | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([getProfile(meId), myQuests(meId), myApplications(meId)])
      .then(([p, q, apps]) => {
        if (!alive) return
        if (p) {
          setPosterName(p.name || meName)
          setPosterMeta(p.parish ? `${p.parish} Guild` : '')
        }
        setQuests(q)
        setDoingApps(apps)
      })
      .catch((e) => notify('Could not load your quests', e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [meId, meName, notify])

  const active = useMemo(() => quests.filter((q) => q.status === 'open'), [quests])
  const singleQuests = active.filter((q) => q.type === 'single')
  const weeklyQuests = active.filter((q) => q.type === 'weekly')
  const history = quests.filter((q) => q.status !== 'open')

  // Quests I've been accepted for (I'm a doer on someone else's quest).
  const doing = useMemo(
    () => doingApps.filter((a) => a.status === 'accepted' && a.quest).map((a) => a.quest as Quest),
    [doingApps],
  )
  const pendingCount = doingApps.filter((a) => a.status === 'applied').length

  const shown = tab === 'single' ? singleQuests : tab === 'weekly' ? weeklyQuests : history

  const tabs: { id: Tab; label: string; icon: typeof ClipboardList; count: number }[] = [
    { id: 'single', label: 'Single-time', icon: ClipboardList, count: singleQuests.length },
    { id: 'weekly', label: 'Weekly', icon: Repeat, count: weeklyQuests.length },
    { id: 'history', label: 'History', icon: History, count: history.length },
  ]

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      {/* Header */}
      <div className="card relative overflow-hidden p-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-clay-500 to-clay-700 opacity-[0.1]" />
        <div className="relative flex items-center gap-4">
          <Avatar initials={initialsOf(posterName || 'You')} gradient={gradientFor(meId)} size="lg" ring />
          <div>
            <h1 className="display text-[26px] font-semibold text-ink">{posterName || 'Your quests'}</h1>
            <p className="text-[13px] text-ink-muted">{posterMeta}</p>
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-3 gap-3">
          <Stat label="Posted by me" value={active.length} tint="text-clay-600" />
          <Stat label="I’m doing" value={doing.length} tint="text-ink" />
          <Stat label="Completed" value={history.length} tint="text-emerald-600" />
        </div>
      </div>

      {/* Scope: posted by me / I'm doing */}
      <div className="mt-6 inline-flex rounded-2xl border border-line/10 bg-surface p-1 shadow-soft">
        {(
          [
            { s: 'posted' as Scope, label: 'Posted by me', count: quests.length },
            { s: 'doing' as Scope, label: 'I’m doing', count: doing.length },
          ]
        ).map((o) => (
          <button
            key={o.s}
            onClick={() => setScope(o.s)}
            className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-medium transition ${
              scope === o.s ? 'text-ink' : 'text-ink-muted hover:text-ink-soft'
            }`}
          >
            {scope === o.s && (
              <motion.span
                layoutId="scope-pill"
                className="absolute inset-0 rounded-xl bg-granite-100"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10">{o.label}</span>
            <span className="relative z-10 rounded-full bg-granite-200 px-1.5 text-[11px] text-ink-soft">
              {o.count}
            </span>
          </button>
        ))}
      </div>

      {scope === 'doing' ? (
        <div className="mt-5">
          {loading ? (
            <div className="card flex items-center justify-center gap-2 py-20 text-ink-muted">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : doing.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 py-16 text-center">
              <Swords className="h-9 w-9 text-ink-faint" />
              <p className="text-[17px] font-semibold text-ink">No accepted quests yet</p>
              <p className="mx-auto max-w-sm text-[14px] text-ink-muted">
                {pendingCount > 0
                  ? `You’ve applied to ${pendingCount} quest${pendingCount === 1 ? '' : 's'} — once a poster accepts you, it’ll show here.`
                  : 'Apply to quests on the board. Once you’re accepted, they appear here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {doing.map((q) => (
                <QuestRow key={q.id} q={q} doing onClick={() => setSelectedDoing(q)} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
      {/* Tabs */}
      <div className="mt-6 flex gap-1 rounded-2xl border border-line/10 bg-surface p-1 shadow-soft">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[14px] font-medium transition ${
              tab === t.id ? 'text-ink' : 'text-ink-muted hover:text-ink-soft'
            }`}
          >
            {tab === t.id && (
              <motion.span
                layoutId="manage-tab"
                className="absolute inset-0 rounded-xl bg-granite-100"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <t.icon className="relative z-10 h-4 w-4" />
            <span className="relative z-10">{t.label}</span>
            <span className="relative z-10 rounded-full bg-granite-200 px-1.5 text-[11px] text-ink-soft">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="mt-5">
        {loading ? (
          <div className="card flex items-center justify-center gap-2 py-20 text-ink-muted">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : shown.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 py-16 text-center">
            <Inbox className="h-9 w-9 text-ink-faint" />
            <p className="text-[17px] font-semibold text-ink">
              {tab === 'history' ? 'Nothing completed yet' : `No ${tab === 'single' ? 'single-time' : 'weekly'} quests`}
            </p>
            <p className="mx-auto max-w-sm text-[14px] text-ink-muted">
              {tab === 'history'
                ? 'Completed and ended quests will be filed here.'
                : 'Head to “Post a Quest” to list one — applicants show up here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((q) => (
              <QuestRow key={q.id} q={q} onClick={() => setSelected(q)} />
            ))}
          </div>
        )}
      </div>
        </>
      )}

      {selected && (
        <ManageModal
          quest={selected}
          onClose={() => setSelected(null)}
          onChanged={(u) => {
            setQuests((prev) => prev.map((x) => (x.id === u.id ? u : x)))
            setSelected((s) => (s && s.id === u.id ? u : s))
          }}
          onRemoved={() => {
            setQuests((prev) => prev.filter((x) => x.id !== selected.id))
            setSelected(null)
          }}
        />
      )}

      {selectedDoing && (
        <QuestModal
          quest={selectedDoing}
          me={{ id: meId, name: posterName }}
          applied
          onApply={async () => {}}
          onClose={() => setSelectedDoing(null)}
        />
      )}
    </div>
  )
}

function QuestRow({ q, onClick, doing }: { q: Quest; onClick: () => void; doing?: boolean }) {
  const CatIcon = iconForCategory(q.category)
  const completed = q.status !== 'open'
  return (
    <button
      onClick={onClick}
      className={`card flex w-full items-center gap-4 p-4 text-left transition hover:border-clay-200 hover:shadow-float ${
        completed ? 'opacity-75' : ''
      }`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-clay-50 text-clay-600 dark:bg-clay-500/15">
        <CatIcon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[16px] font-semibold text-ink">{q.title}</h3>
          {q.type === 'weekly' ? (
            <span className="pill shrink-0 bg-clay-500/10 text-clay-700 dark:text-clay-300">
              <Repeat className="h-3 w-3" /> Weekly
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12.5px] text-ink-muted">
          <span>{q.parish} Guild</span>
          {doing && q.poster?.name && <span>by {q.poster.name}</span>}
          <span className="inline-flex items-center gap-1"><Coins className="h-3.5 w-3.5" /> £{q.reward}</span>
          <span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> +{q.xp_reward} XP</span>
          {!doing && (
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {q.accepted_count}/{q.party_size}</span>
          )}
        </p>
      </div>
      {doing ? (
        <span className="pill shrink-0 bg-emerald-100 text-emerald-700">
          <Check className="h-3.5 w-3.5" /> Accepted
        </span>
      ) : !completed && (
        <span className="pill shrink-0 bg-granite-100 text-ink-muted">
          {q.applicant_count} {q.applicant_count === 1 ? 'applicant' : 'applicants'}
        </span>
      )}
    </button>
  )
}

// ── Management modal ─────────────────────────────────────────────────────────
function ManageModal({
  quest,
  onClose,
  onChanged,
  onRemoved,
}: {
  quest: Quest
  onClose: () => void
  onChanged: (q: Quest) => void
  onRemoved: () => void
}) {
  const { notify } = useToast()
  const { openChat } = useChatNav()
  const [apps, setApps] = useState<Application[] | null>(null)
  const [logs, setLogs] = useState<WeekLog[]>([])
  const [working, setWorking] = useState(false)

  const completed = quest.status !== 'open'
  const isWeekly = quest.type === 'weekly'
  const CatIcon = iconForCategory(quest.category)

  useEffect(() => {
    let alive = true
    // Load applicants first so the list always renders, even if week logs fail.
    questApplications(quest.id)
      .then((a) => alive && setApps(a))
      .catch((e) => {
        if (alive) setApps([])
        notify('Could not load applicants', (e as Error).message)
      })
    if (isWeekly) {
      questWeekLogs(quest.id)
        .then((l) => alive && setLogs(l))
        .catch(() => alive && setLogs([]))
    }
    return () => {
      alive = false
    }
  }, [quest.id, isWeekly, notify])

  const accepted = (apps ?? []).filter((a) => a.status === 'accepted')

  async function decide(app: Application, status: 'accepted' | 'rejected') {
    try {
      await setApplicationStatus(app.id, status)
      const updated = (apps ?? []).map((a) => (a.id === app.id ? { ...a, status } : a))
      setApps(updated)
      onChanged({ ...quest, accepted_count: updated.filter((a) => a.status === 'accepted').length })
    } catch (e) {
      notify('Could not update', (e as Error).message)
    }
  }

  async function finishSingle() {
    setWorking(true)
    try {
      await completeQuest(quest.id)
      onChanged({ ...quest, status: 'completed' })
      notify('Quest completed', 'XP released to the party. Nice one.')
      onClose()
    } catch (e) {
      notify('Could not complete', (e as Error).message)
    } finally {
      setWorking(false)
    }
  }

  async function endWeekly() {
    setWorking(true)
    try {
      await archiveQuest(quest.id)
      onChanged({ ...quest, status: 'completed' })
      notify('Weekly quest ended', 'Moved to your history.')
      onClose()
    } catch (e) {
      notify('Could not end quest', (e as Error).message)
    } finally {
      setWorking(false)
    }
  }

  async function remove() {
    setWorking(true)
    try {
      await deleteQuest(quest.id)
      onRemoved()
    } catch (e) {
      notify('Could not delete', (e as Error).message)
      setWorking(false)
    }
  }

  async function toggleWeek(doerId: string, week: string, on: boolean) {
    // optimistic
    setLogs((prev) =>
      on
        ? [...prev, { id: `tmp-${week}-${doerId}`, quest_id: quest.id, doer_id: doerId, week_start: week, created_at: '' }]
        : prev.filter((l) => !(l.doer_id === doerId && l.week_start === week)),
    )
    try {
      if (on) await logWeek(quest.id, doerId, week)
      else await unlogWeek(quest.id, doerId, week)
    } catch (e) {
      // revert
      setLogs((prev) =>
        on
          ? prev.filter((l) => !(l.doer_id === doerId && l.week_start === week))
          : [...prev, { id: `tmp-${week}-${doerId}`, quest_id: quest.id, doer_id: doerId, week_start: week, created_at: '' }],
      )
      notify('Could not update week', (e as Error).message)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-4xl bg-surface shadow-float sm:rounded-4xl"
        >
          {/* Header */}
          <div className="relative overflow-hidden px-7 pb-5 pt-7">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-clay-500 to-clay-700 opacity-[0.08]" />
            <button
              onClick={onClose}
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-surface/80 text-ink-muted shadow-soft backdrop-blur transition hover:text-ink"
              aria-label="Close"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-clay-50 text-clay-600 dark:bg-clay-500/15">
                <CatIcon className="h-5 w-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[21px] font-semibold leading-tight text-ink">{quest.title}</h2>
                  {isWeekly && (
                    <span className="pill bg-clay-500/10 text-clay-700 dark:text-clay-300">
                      <Repeat className="h-3 w-3" /> Weekly
                    </span>
                  )}
                  {completed && (
                    <span className="pill bg-emerald-100 text-emerald-700">Completed</span>
                  )}
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[12.5px] text-ink-muted">
                  <span>{quest.parish} Guild</span>
                  <span className="inline-flex items-center gap-1"><Coins className="h-3.5 w-3.5" /> £{quest.reward}</span>
                  <span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> +{quest.xp_reward} XP</span>
                  {quest.schedule && <span>{quest.schedule}</span>}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-7 pb-7">
            {quest.description && (
              <p className="text-[14.5px] leading-relaxed text-ink-muted">{quest.description}</p>
            )}

            {/* Applicants, weekly log & actions */}
            {(
              <>
                <div>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
                    Applicants
                  </p>
                  {apps === null ? (
                    <div className="flex items-center gap-2 py-4 text-[13px] text-ink-muted">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </div>
                  ) : apps.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-line/15 bg-granite-50/60 px-4 py-6 text-center text-[13px] text-ink-muted">
                      No applicants yet.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {apps.map((a) => (
                        <div key={a.id} className="flex items-start gap-3 rounded-2xl border border-line/10 bg-surface p-3">
                          <Avatar initials={initialsOf(a.doer?.name ?? '?')} gradient={gradientFor(a.doer_id)} size="md" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-[14px] font-semibold text-ink">{a.doer?.name ?? 'Adventurer'}</p>
                              {a.doer && (
                                <span className="text-[11px] text-ink-faint">
                                  {a.doer.xp} XP · {a.doer.parish || 'Jersey'}
                                </span>
                              )}
                            </div>
                            {a.message && (
                              <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">“{a.message}”</p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <button
                                onClick={() =>
                                  openChat({
                                    questId: quest.id,
                                    doerId: a.doer_id,
                                    questTitle: quest.title,
                                    otherName: a.doer?.name ?? 'Adventurer',
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded-lg bg-granite-100 px-2.5 py-1 text-[12.5px] font-medium text-ink-soft transition hover:bg-granite-200"
                              >
                                <MessageCircle className="h-3.5 w-3.5" /> Open chat
                              </button>
                              {a.status === 'accepted' ? (
                                <span className="pill bg-emerald-100 py-1 text-[12px] text-emerald-700">
                                  <Check className="h-3.5 w-3.5" /> On the party
                                </span>
                              ) : a.status === 'rejected' ? (
                                <span className="pill bg-granite-100 py-1 text-[12px] text-ink-faint">Declined</span>
                              ) : (
                                !completed && (
                                  <>
                                    <button
                                      onClick={() => decide(a, 'accepted')}
                                      disabled={accepted.length >= quest.party_size}
                                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-[12.5px] font-medium text-white transition hover:bg-emerald-600 disabled:opacity-40"
                                    >
                                      <Check className="h-3.5 w-3.5" /> Accept
                                    </button>
                                    <button
                                      onClick={() => decide(a, 'rejected')}
                                      className="inline-flex items-center gap-1 rounded-lg bg-granite-100 px-2.5 py-1 text-[12.5px] font-medium text-ink-muted transition hover:bg-granite-200"
                                    >
                                      Decline
                                    </button>
                                  </>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Weekly calendar */}
                {isWeekly && accepted.length > 0 && (
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
                      <CalendarDays className="h-3.5 w-3.5" /> Weekly log — tick each week the doer did it
                    </p>
                    <div className="space-y-3">
                      {accepted.map((a) => (
                        <WeekCalendar
                          key={a.id}
                          doerId={a.doer_id}
                          doerName={a.doer?.name ?? 'Doer'}
                          xp={quest.xp_reward}
                          logs={logs}
                          disabled={completed}
                          onToggle={toggleWeek}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {!completed && (
                  <div className="flex flex-wrap items-center gap-3 border-t border-line/10 pt-4">
                    {isWeekly ? (
                      <button onClick={endWeekly} disabled={working} className="btn-accent py-2.5 text-[14px]">
                        {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <><History className="h-4 w-4" /> End & archive</>}
                      </button>
                    ) : (
                      <button
                        onClick={finishSingle}
                        disabled={working || accepted.length === 0}
                        className="btn-accent py-2.5 text-[14px]"
                        title={accepted.length === 0 ? 'Accept at least one doer first' : ''}
                      >
                        {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PartyPopper className="h-4 w-4" /> Complete & release XP</>}
                      </button>
                    )}
                    <button
                      onClick={remove}
                      disabled={working}
                      className="btn-ghost ml-auto py-2.5 text-[14px] text-clay-700 hover:bg-clay-500/10"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function WeekCalendar({
  doerId,
  doerName,
  xp,
  logs,
  disabled,
  onToggle,
}: {
  doerId: string
  doerName: string
  xp: number
  logs: WeekLog[]
  disabled?: boolean
  onToggle: (doerId: string, week: string, on: boolean) => void
}) {
  const weeks = useMemo(() => lastNWeeks(8), [])
  const done = new Set(logs.filter((l) => l.doer_id === doerId).map((l) => l.week_start))
  const count = weeks.filter((w) => done.has(w.iso)).length

  return (
    <div className="rounded-2xl border border-line/10 bg-granite-50/60 p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar initials={initialsOf(doerName)} gradient={gradientFor(doerId)} size="sm" />
          <p className="text-[13.5px] font-semibold text-ink">{doerName}</p>
        </div>
        <span className="pill bg-clay-500/10 text-clay-700 dark:text-clay-300">
          {count} {count === 1 ? 'week' : 'weeks'} · {count * xp} XP
        </span>
      </div>
      <div className="grid grid-cols-8 gap-1.5">
        {weeks.map((w) => {
          const on = done.has(w.iso)
          return (
            <button
              key={w.iso}
              disabled={disabled}
              onClick={() => onToggle(doerId, w.iso, !on)}
              className={`flex flex-col items-center gap-1 rounded-lg border py-1.5 text-[10.5px] transition disabled:opacity-60 ${
                on
                  ? 'border-clay-500 bg-clay-500/15 text-clay-700 dark:text-clay-300'
                  : 'border-line/10 bg-surface text-ink-faint hover:border-clay-300'
              }`}
              title={on ? 'Done — click to undo' : 'Mark as done'}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full ${
                  on ? 'bg-clay-600 text-white' : 'bg-granite-200'
                }`}
              >
                {on && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              </span>
              {w.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <div className="rounded-2xl border border-line/10 bg-granite-50/60 px-3 py-3 text-center">
      <div className={`text-[22px] font-bold tracking-tight ${tint}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</div>
    </div>
  )
}
