import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Loader2,
  Users,
  Coins,
  Sparkles,
  Trash2,
  ChevronDown,
  Check,
  X,
  MessageCircle,
  ShieldCheck,
  PartyPopper,
  Inbox,
  Bus,
  Repeat,
} from 'lucide-react'
import { gradientFor, initialsOf, iconForCategory } from '../lib/constants'
import type { Application, Poster, Quest } from '../lib/types'
import {
  completeQuest,
  deleteQuest,
  getMyPoster,
  myQuests,
  questApplications,
  setApplicationStatus,
  updatePoster,
} from '../lib/db'
import { useToast } from '../components/Toast'
import Avatar from '../components/Avatar'
import Chat from '../components/Chat'

export default function PosterManage({ meId, meName }: { meId: string; meName: string }) {
  const { notify } = useToast()
  const [poster, setPoster] = useState<Poster | null>(null)
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([getMyPoster(meId), myQuests(meId)])
      .then(([p, q]) => {
        if (!alive) return
        setPoster(p)
        setQuests(q)
      })
      .catch((e) => notify('Could not load your quests', e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [meId, notify])

  const open = quests.filter((q) => q.status === 'open')
  const done = quests.filter((q) => q.status === 'completed')
  const totalApplicants = quests.reduce((s, q) => s + q.applicant_count, 0)

  async function toggleVerified() {
    if (!poster) return
    const next = !poster.community_verified
    setPoster({ ...poster, community_verified: next })
    try {
      await updatePoster(meId, { community_verified: next })
      notify(next ? 'Community Verified badge on' : 'Badge hidden')
    } catch (e) {
      setPoster({ ...poster, community_verified: !next })
      notify('Could not update', (e as Error).message)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      {/* Header */}
      <div className="card relative overflow-hidden p-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-jersey-500 to-jersey-700 opacity-[0.1]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar initials={initialsOf(meName || 'You')} gradient={gradientFor(meId)} size="lg" ring />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[24px] font-semibold tracking-tight text-ink">
                  {poster?.name || meName || 'Your listings'}
                </h1>
                {poster?.community_verified && (
                  <span className="pill bg-jersey-100 text-jersey-700">
                    <ShieldCheck className="h-3.5 w-3.5" /> Community Verified
                  </span>
                )}
              </div>
              <p className="text-[13px] text-ink-muted">
                {poster?.kind === 'business' ? 'Small business' : 'Resident'}
                {poster?.parish ? ` · ${poster.parish}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-granite-200 bg-granite-50 px-4 py-2.5">
            <div>
              <p className="text-[12.5px] font-medium text-ink">Community Verified badge</p>
              <p className="text-[11px] text-ink-faint">Builds trust with doers</p>
            </div>
            <button
              onClick={toggleVerified}
              role="switch"
              aria-checked={poster?.community_verified ?? false}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                poster?.community_verified ? 'bg-jersey-600' : 'bg-granite-300'
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  poster?.community_verified ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-3">
          <Stat label="Open quests" value={open.length} tint="text-jersey-600" />
          <Stat label="Applicants" value={totalApplicants} tint="text-ink" />
          <Stat label="Completed" value={done.length} tint="text-emerald-600" />
        </div>
      </div>

      {/* Quests */}
      <div className="mt-6">
        {loading ? (
          <div className="card flex items-center justify-center gap-2 py-20 text-ink-muted">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : quests.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 py-16 text-center">
            <Inbox className="h-9 w-9 text-ink-faint" />
            <p className="text-[17px] font-semibold text-ink">No quests yet</p>
            <p className="mx-auto max-w-sm text-[14px] text-ink-muted">
              Head to “Post a Quest” to list your first job. Applicants and Safe-Chat will
              show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {quests.map((q) => (
              <QuestManageCard
                key={q.id}
                quest={q}
                meId={meId}
                meName={meName}
                notify={notify}
                onDeleted={() => setQuests((prev) => prev.filter((x) => x.id !== q.id))}
                onChanged={(updated) =>
                  setQuests((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function QuestManageCard({
  quest,
  meId,
  meName,
  notify,
  onDeleted,
  onChanged,
}: {
  quest: Quest
  meId: string
  meName: string
  notify: (t: string, d?: string) => void
  onDeleted: () => void
  onChanged: (q: Quest) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [apps, setApps] = useState<Application[] | null>(null)
  const [loadingApps, setLoadingApps] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [working, setWorking] = useState(false)

  const completed = quest.status === 'completed'

  async function toggle() {
    const next = !expanded
    setExpanded(next)
    if (next && apps === null) {
      setLoadingApps(true)
      try {
        setApps(await questApplications(quest.id))
      } catch (e) {
        notify('Could not load applicants', (e as Error).message)
      } finally {
        setLoadingApps(false)
      }
    }
  }

  async function decide(app: Application, status: 'accepted' | 'rejected') {
    try {
      await setApplicationStatus(app.id, status)
      const updated = (apps ?? []).map((a) => (a.id === app.id ? { ...a, status } : a))
      setApps(updated)
      const accepted = updated.filter((a) => a.status === 'accepted').length
      onChanged({ ...quest, accepted_count: accepted })
      if (status === 'accepted')
        notify(`${app.doer?.name ?? 'Doer'} added to the party`, 'They can now chat with you.')
    } catch (e) {
      notify('Could not update', (e as Error).message)
    }
  }

  async function markComplete() {
    setWorking(true)
    try {
      await completeQuest(quest.id)
      onChanged({ ...quest, status: 'completed' })
      notify('Quest completed', 'XP released to the party. Nice one.')
    } catch (e) {
      notify('Could not complete', (e as Error).message)
    } finally {
      setWorking(false)
    }
  }

  async function remove() {
    setWorking(true)
    try {
      await deleteQuest(quest.id)
      onDeleted()
    } catch (e) {
      notify('Could not delete', (e as Error).message)
      setWorking(false)
    }
  }

  const acceptedCount = quest.accepted_count
  const CatIcon = iconForCategory(quest.category)

  return (
    <div className={`card overflow-hidden ${completed ? 'opacity-80' : ''}`}>
      <button onClick={toggle} className="flex w-full items-center gap-4 p-5 text-left">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-clay-50 text-clay-600">
          <CatIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[16px] font-semibold text-ink">{quest.title}</h3>
            {completed && (
              <span className="pill shrink-0 bg-emerald-100 text-emerald-700">Completed</span>
            )}
            {quest.type === 'weekly' && !completed && (
              <span className="pill shrink-0 bg-jersey-100 text-jersey-700">
                <Repeat className="h-3 w-3" /> Weekly
              </span>
            )}
            {quest.bus_friendly && (
              <Bus className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            )}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12.5px] text-ink-muted">
            <span>{quest.parish} Guild</span>
            <span className="inline-flex items-center gap-1"><Coins className="h-3.5 w-3.5" /> £{quest.reward}</span>
            <span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> +{quest.xp_reward} XP</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {acceptedCount}/{quest.party_size}
            </span>
          </p>
        </div>
        <span className="flex items-center gap-2">
          <span className="pill bg-granite-100 text-ink-muted">
            {quest.applicant_count} {quest.applicant_count === 1 ? 'applicant' : 'applicants'}
          </span>
          <ChevronDown
            className={`h-5 w-5 text-ink-faint transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-granite-100"
          >
            <div className="space-y-4 p-5">
              {/* Applicants */}
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
                  Applicants
                </p>
                {loadingApps ? (
                  <div className="flex items-center gap-2 py-4 text-[13px] text-ink-muted">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                  </div>
                ) : !apps || apps.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-granite-200 bg-granite-50/50 px-4 py-6 text-center text-[13px] text-ink-muted">
                    No applicants yet. Share your quest — adventurers are on their way.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {apps.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-start gap-3 rounded-2xl border border-granite-200 bg-white p-3"
                      >
                        <Avatar
                          initials={initialsOf(a.doer?.name ?? '?')}
                          gradient={gradientFor(a.doer_id)}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[14px] font-semibold text-ink">
                              {a.doer?.name ?? 'Adventurer'}
                            </p>
                            {a.doer && (
                              <span className="text-[11px] text-ink-faint">
                                {a.doer.xp} XP · {a.doer.parish || 'Jersey'}
                              </span>
                            )}
                          </div>
                          {a.message && (
                            <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">“{a.message}”</p>
                          )}
                          {a.doer && a.doer.skills.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {a.doer.skills.slice(0, 4).map((s) => (
                                <span key={s} className="pill bg-granite-100 py-0.5 text-[11px] text-ink-soft">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {!completed && (
                          <div className="flex shrink-0 items-center gap-1.5">
                            {a.status === 'accepted' ? (
                              <span className="pill bg-emerald-100 text-emerald-700">
                                <Check className="h-3.5 w-3.5" /> On party
                              </span>
                            ) : a.status === 'rejected' ? (
                              <span className="pill bg-granite-100 text-ink-faint">Declined</span>
                            ) : (
                              <>
                                <button
                                  onClick={() => decide(a, 'accepted')}
                                  disabled={acceptedCount >= quest.party_size}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white transition hover:bg-emerald-600 disabled:opacity-40"
                                  aria-label="Accept"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => decide(a, 'rejected')}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-granite-100 text-ink-muted transition hover:bg-granite-200"
                                  aria-label="Decline"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Safe-Chat */}
              <div>
                <button
                  onClick={() => setShowChat((v) => !v)}
                  className="mb-2 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-jersey-600 hover:text-jersey-800"
                >
                  <MessageCircle className="h-4 w-4" />
                  {showChat ? 'Hide Safe-Chat' : 'Open Safe-Chat'}
                </button>
                {showChat && <Chat questId={quest.id} meId={meId} meName={meName} />}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 border-t border-granite-100 pt-4">
                {!completed && (
                  <button
                    onClick={markComplete}
                    disabled={working || acceptedCount === 0}
                    className="btn-accent py-2.5 text-[14px]"
                    title={acceptedCount === 0 ? 'Accept at least one doer first' : ''}
                  >
                    {working ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <PartyPopper className="h-4 w-4" /> Complete & release XP
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={remove}
                  disabled={working}
                  className="btn-ghost ml-auto py-2.5 text-[14px] text-jersey-700 hover:bg-jersey-50"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Stat({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <div className="rounded-2xl border border-granite-200 bg-granite-50/60 px-3 py-3 text-center">
      <div className={`text-[22px] font-bold tracking-tight ${tint}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</div>
    </div>
  )
}
