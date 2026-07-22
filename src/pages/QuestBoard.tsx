import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search,
  Bus,
  Repeat,
  Coins,
  Sparkles,
  Users,
  MapPin,
  Loader2,
  Compass,
  ShieldCheck,
} from 'lucide-react'
import { parishes, categoryEmoji, gradientFor, initialsOf } from '../lib/constants'
import type { Quest, QuestType } from '../lib/types'
import { applyToQuest, listQuests, myApplications } from '../lib/db'
import { useToast } from '../components/Toast'
import Avatar from '../components/Avatar'
import QuestModal from '../components/QuestModal'

interface Me {
  id: string
  name: string
  role: 'doer' | 'poster'
}

export default function QuestBoard({
  me,
  appliedIds,
  onApplied,
}: {
  me: Me
  appliedIds: Set<string>
  onApplied: (questId: string) => void
}) {
  const { notify } = useToast()
  const [quests, setQuests] = useState<Quest[]>([])
  const [applied, setApplied] = useState<Set<string>>(appliedIds)
  const [loading, setLoading] = useState(true)

  const [query, setQuery] = useState('')
  const [type, setType] = useState<'All' | QuestType>('All')
  const [parish, setParish] = useState<'All' | string>('All')
  const [busOnly, setBusOnly] = useState(false)
  const [selected, setSelected] = useState<Quest | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const q = await listQuests()
        if (!alive) return
        setQuests(q)
        if (me.role === 'doer') {
          const apps = await myApplications(me.id)
          if (alive) setApplied(new Set(apps.map((a) => a.quest_id)))
        }
      } catch (e) {
        notify('Could not load the board', (e as Error).message)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [me.id, me.role, notify])

  const parishCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const q of quests) m.set(q.parish, (m.get(q.parish) ?? 0) + 1)
    return m
  }, [quests])

  const results = useMemo(() => {
    const s = query.trim().toLowerCase()
    return quests.filter((q) => {
      const mType = type === 'All' || q.type === type
      const mParish = parish === 'All' || q.parish === parish
      const mBus = !busOnly || q.bus_friendly
      const mQ =
        !s ||
        [q.title, q.description, q.category, q.parish, q.poster?.name ?? '']
          .join(' ')
          .toLowerCase()
          .includes(s)
      return mType && mParish && mBus && mQ
    })
  }, [quests, query, type, parish, busOnly])

  async function handleApply(quest: Quest, message: string) {
    if (me.role !== 'doer') return
    setApplied((prev) => new Set(prev).add(quest.id))
    onApplied(quest.id)
    setQuests((prev) =>
      prev.map((q) =>
        q.id === quest.id ? { ...q, applicant_count: q.applicant_count + 1 } : q,
      ),
    )
    try {
      await applyToQuest(quest.id, me.id, message)
      notify('Quest accepted!', 'The poster can now chat with you in Safe-Chat.')
    } catch (e) {
      setApplied((prev) => {
        const n = new Set(prev)
        n.delete(quest.id)
        return n
      })
      notify('Could not apply', (e as Error).message)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-6">
        <span className="pill bg-jersey-600 text-white">
          <Compass className="h-3.5 w-3.5" /> The Quest Board
        </span>
        <h1 className="mt-3 text-[34px] font-semibold tracking-tight text-ink sm:text-[42px]">
          Find your next quest.
        </h1>
        <p className="mt-1.5 max-w-xl text-[16px] text-ink-muted">
          Local jobs across Jersey’s parish Guilds. Filter by your patch, pick single-time
          or weekly, and earn XP with every quest you complete.
        </p>
      </div>

      {/* Guild strip */}
      <div className="mb-5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <GuildChip
          label="All Guilds"
          count={quests.length}
          active={parish === 'All'}
          onClick={() => setParish('All')}
        />
        {parishes.map((p) => (
          <GuildChip
            key={p}
            label={p}
            count={parishCounts.get(p) ?? 0}
            active={parish === p}
            onClick={() => setParish(p)}
          />
        ))}
      </div>

      {/* Search + filters */}
      <div className="sticky top-[76px] z-30 mb-6 rounded-3xl border border-white/70 bg-white/75 p-3 shadow-glass backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search quests — “dog walking”, “tech help”, “moving”…"
              className="field pl-11"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-granite-100 p-1">
              {(['All', 'single', 'weekly'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium capitalize transition ${
                    type === t ? 'bg-white text-ink shadow-soft' : 'text-ink-muted'
                  }`}
                >
                  {t === 'All' ? 'All' : t === 'single' ? 'Single' : 'Weekly'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setBusOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition ${
                busOnly
                  ? 'bg-emerald-600 text-white shadow-soft'
                  : 'bg-granite-100 text-ink-muted hover:bg-granite-200'
              }`}
            >
              <Bus className="h-4 w-4" /> Bus friendly
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="card flex items-center justify-center gap-2 py-24 text-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading quests…
        </div>
      ) : quests.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-20 text-center">
          <Compass className="h-9 w-9 text-ink-faint" />
          <p className="text-[18px] font-semibold text-ink">The board is empty… for now.</p>
          <p className="mx-auto max-w-sm text-[14px] text-ink-muted">
            No quests have been posted yet. As residents and businesses post jobs, they’ll
            appear here for you to grab.
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-20 text-center">
          <Search className="h-8 w-8 text-ink-faint" />
          <p className="text-[17px] font-medium text-ink">No quests match those filters.</p>
          <button
            onClick={() => {
              setQuery('')
              setType('All')
              setParish('All')
              setBusOnly(false)
            }}
            className="btn-ghost mt-2 py-2 text-[14px]"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {results.map((q) => (
              <QuestCard
                key={q.id}
                q={q}
                applied={applied.has(q.id)}
                onClick={() => setSelected(q)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {selected && (
        <QuestModal
          quest={selected}
          me={me}
          applied={applied.has(selected.id)}
          onApply={(msg) => handleApply(selected, msg)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function GuildChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
        active
          ? 'bg-jersey-600 text-white shadow-redglow'
          : 'bg-white text-ink-muted ring-1 ring-granite-200 hover:ring-jersey-200'
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 text-[11px] ${
          active ? 'bg-white/25' : 'bg-granite-100 text-ink-faint'
        }`}
      >
        {count}
      </span>
    </button>
  )
}

function QuestCard({
  q,
  applied,
  onClick,
}: {
  q: Quest
  applied: boolean
  onClick: () => void
}) {
  const spotsLeft = Math.max(0, q.party_size - q.accepted_count)
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-granite-200/80 bg-white p-5 text-left shadow-soft transition-all hover:-translate-y-1 hover:border-jersey-200 hover:shadow-float"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="pill bg-granite-100 text-ink-soft">
          {categoryEmoji[q.category] ?? '⭐'} {q.category}
        </span>
        <div className="flex items-center gap-1.5">
          {q.bus_friendly && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Bus className="h-3.5 w-3.5" />
            </span>
          )}
          {q.type === 'weekly' && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-jersey-100 text-jersey-700">
              <Repeat className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>

      <h3 className="mt-3 text-[17px] font-semibold leading-snug tracking-tight text-ink">
        {q.title}
      </h3>

      <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-ink-muted">
        <MapPin className="h-3.5 w-3.5 text-jersey-500" />
        {q.parish || 'Jersey'} Guild
      </div>

      {q.description && (
        <p className="mt-2 line-clamp-2 flex-1 text-[13.5px] leading-snug text-ink-muted">
          {q.description}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <span className="pill bg-jersey-50 text-jersey-700">
          <Coins className="h-3.5 w-3.5" /> £{q.reward}
        </span>
        <span className="pill bg-gold-400/20 text-gold-600">
          <Sparkles className="h-3.5 w-3.5" /> +{q.xp_reward} XP
        </span>
        {q.party_size > 1 && (
          <span className="pill bg-granite-100 text-ink-muted">
            <Users className="h-3.5 w-3.5" /> {q.accepted_count}/{q.party_size}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-granite-100 pt-3.5">
        <span className="flex items-center gap-2 text-[12.5px] text-ink-muted">
          <Avatar
            initials={initialsOf(q.poster?.name ?? '?')}
            gradient={gradientFor(q.poster_id)}
            size="sm"
          />
          <span className="inline-flex items-center gap-1">
            {q.poster?.name ?? 'A local'}
            {q.poster?.community_verified && (
              <ShieldCheck className="h-3.5 w-3.5 text-jersey-600" />
            )}
          </span>
        </span>
        {applied ? (
          <span className="pill bg-emerald-100 text-emerald-700">Applied</span>
        ) : q.party_size > 1 ? (
          <span className="text-[12px] font-medium text-ink-faint">
            {spotsLeft > 0 ? `${spotsLeft} left` : 'Full'}
          </span>
        ) : null}
      </div>
    </motion.button>
  )
}
