import { useEffect, useMemo, useRef, useState } from 'react'
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
  Tag,
  X,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react'
import { parishes, questCategories, iconForCategory, gradientFor, initialsOf } from '../lib/constants'
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
  const [category, setCategory] = useState<'All' | string>('All')
  const [minPay, setMinPay] = useState(0)
  const [busOnly, setBusOnly] = useState(false)
  const [selected, setSelected] = useState<Quest | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Press "/" anywhere to jump to the search bar.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      const typing =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
      if (e.key === '/' && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.scrollIntoView({ block: 'nearest' })
      } else if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        searchRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const filtersActive =
    type !== 'All' || parish !== 'All' || category !== 'All' || minPay > 0 || busOnly || !!query

  function resetFilters() {
    setQuery('')
    setType('All')
    setParish('All')
    setCategory('All')
    setMinPay(0)
    setBusOnly(false)
  }

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

  const results = useMemo(() => {
    const s = query.trim().toLowerCase()
    return quests.filter((q) => {
      const mType = type === 'All' || q.type === type
      const mParish = parish === 'All' || q.parish === parish
      const mCategory = category === 'All' || q.category === category
      const mPay = q.reward >= minPay
      const mBus = !busOnly || q.bus_friendly
      const mQ =
        !s ||
        [q.title, q.description, q.category, q.parish, q.poster?.name ?? '']
          .join(' ')
          .toLowerCase()
          .includes(s)
      return mType && mParish && mCategory && mPay && mBus && mQ
    })
  }, [quests, query, type, parish, category, minPay, busOnly])

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
    <div className="mx-auto max-w-6xl px-5 pb-28 pt-10">
      <div className="mb-6">
        <span className="pill bg-jersey-600 text-white">
          <Compass className="h-3.5 w-3.5" /> The Quest Board
        </span>
        <h1 className="display mt-3 text-[34px] font-semibold text-ink sm:text-[42px]">
          Find your next quest.
        </h1>
        <p className="mt-1.5 max-w-xl text-[16px] text-ink-muted">
          Local jobs across Jersey’s parish Guilds. Filter by your patch, pick single-time
          or weekly, and earn XP with every quest you complete.
        </p>
      </div>

      {/* Dropdown filters */}
      <div className="sticky top-[76px] z-30 mb-6 rounded-2xl border border-line/10 bg-surface/80 p-3 shadow-glass backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2.5">
          <FilterSelect
            icon={MapPin}
            value={parish}
            onChange={setParish}
            options={['All', ...parishes]}
            labels={{ All: 'All Guilds' }}
          />
          <FilterSelect
            icon={Repeat}
            value={type}
            onChange={(v) => setType(v as 'All' | QuestType)}
            options={['All', 'single', 'weekly']}
            labels={{ All: 'Any type', single: 'Single-time', weekly: 'Weekly' }}
          />
          <FilterSelect
            icon={Tag}
            value={category}
            onChange={setCategory}
            options={['All', ...questCategories]}
            labels={{ All: 'Any job type' }}
          />
          <FilterSelect
            icon={Coins}
            value={String(minPay)}
            onChange={(v) => setMinPay(Number(v))}
            options={['0', '5', '10', '20', '40']}
            labels={{ '0': 'Any pay', '5': '£5+', '10': '£10+', '20': '£20+', '40': '£40+' }}
          />
          <button
            onClick={() => setBusOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13.5px] font-medium transition ${
              busOnly
                ? 'bg-emerald-600 text-white shadow-soft'
                : 'bg-granite-100 text-ink-muted hover:bg-granite-200'
            }`}
          >
            <Bus className="h-4 w-4" /> Bus friendly
          </button>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-[13px] text-ink-faint sm:block">
              {results.length} {results.length === 1 ? 'quest' : 'quests'}
            </span>
            {filtersActive && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-clay-600 hover:text-clay-800"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
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

      {/* Always-visible floating search bar */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
        <div className="pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-2xl border border-line/10 bg-surface/90 p-2 pl-4 shadow-float backdrop-blur-xl">
          <Search className="h-4.5 w-4.5 shrink-0 text-ink-faint" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search quests — dog walking, tech help, moving…"
            className="w-full bg-transparent text-[15px] text-ink-soft placeholder:text-ink-faint outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-faint transition hover:bg-granite-100 hover:text-ink"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="hidden shrink-0 rounded-md border border-line/15 bg-granite-100 px-1.5 py-0.5 text-[11px] font-medium text-ink-faint sm:block">
              /
            </kbd>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterSelect({
  icon: Icon,
  value,
  onChange,
  options,
  labels = {},
}: {
  icon: LucideIcon
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  labels?: Record<string, string>
}) {
  const active = value !== 'All' && value !== '0'
  return (
    <div
      className={`relative inline-flex items-center rounded-xl border transition ${
        active
          ? 'border-clay-300 bg-clay-500/10 text-clay-700 dark:text-clay-300'
          : 'border-line/10 bg-granite-100 text-ink-soft'
      }`}
    >
      <Icon className="pointer-events-none absolute left-3 h-4 w-4 opacity-70" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent py-2 pl-9 pr-8 text-[13.5px] font-medium outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-surface text-ink">
            {labels[o] ?? o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 opacity-60" />
    </div>
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
  const CatIcon = iconForCategory(q.category)
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-black/[0.07] bg-surface p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-clay-200 hover:shadow-float"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="pill bg-granite-100 text-ink-soft">
          <CatIcon className="h-3.5 w-3.5" /> {q.category}
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
        <span className="pill bg-clay-50 text-clay-700">
          <Coins className="h-3.5 w-3.5" /> £{q.reward}
        </span>
        <span className="pill bg-granite-100 text-ink-soft">
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
          <span className="inline-flex items-center gap-1">{q.poster?.name ?? 'A local'}</span>
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
