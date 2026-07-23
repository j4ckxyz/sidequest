import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Facebook,
  ScanLine,
  ClipboardPaste,
  Loader2,
  Coins,
  Sparkles,
  MapPin,
  Repeat,
  Send,
  X,
  Check,
  ChevronDown,
  RefreshCw,
  Quote,
  CircleSlash,
  Wand2,
} from 'lucide-react'
import {
  SAMPLE_FEED,
  scrapeFeed,
  parsePastedFeed,
  type RawPost,
  type ScrapedQuest,
  type Confidence,
} from '../lib/fbScraper'
import { parishes, questCategories, iconForCategory, xpForReward } from '../lib/constants'
import type { QuestType } from '../lib/types'
import { createQuest } from '../lib/db'
import { useToast } from '../components/Toast'

// Per-card edits the user can make before posting.
interface Edit {
  title: string
  category: string
  parish: string
  type: QuestType
  reward: number
  schedule: string
}

const GROUP_NAME = 'Jersey Ask Advice'

export default function FacebookImport({
  meId,
  onGoToBoard,
}: {
  meId: string
  onGoToBoard: () => void
}) {
  const { notify } = useToast()

  const [phase, setPhase] = useState<'idle' | 'scanning' | 'done'>('idle')
  const [posts, setPosts] = useState<RawPost[]>([])
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [showSkipped, setShowSkipped] = useState(false)

  const [edits, setEdits] = useState<Record<string, Partial<Edit>>>({})
  const [posted, setPosted] = useState<Set<string>>(new Set())
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<Set<string>>(new Set())

  const results = useMemo(() => scrapeFeed(posts), [posts])
  const helpRequests = results.filter((r) => r.isHelpRequest)
  const skipped = results.filter((r) => !r.isHelpRequest)
  const pending = helpRequests.filter(
    (r) => !posted.has(r.source.id) && !dismissed.has(r.source.id),
  )

  function scan() {
    setPhase('scanning')
    setPasteOpen(false)
    // A short beat so the "scanning the group" state is legible.
    window.setTimeout(() => {
      setPosts(SAMPLE_FEED)
      setPhase('done')
    }, 900)
  }

  function analysePasted() {
    const parsed = parsePastedFeed(pasteText)
    if (parsed.length === 0) {
      notify('Nothing to analyse', 'Paste one or more posts from the group first.')
      return
    }
    setPosts(parsed)
    setPhase('done')
    setPasteOpen(false)
  }

  function reset() {
    setPosts([])
    setEdits({})
    setPosted(new Set())
    setDismissed(new Set())
    setPhase('idle')
  }

  // Merge scraper defaults with any user edits for a given card.
  function current(r: ScrapedQuest): Edit {
    const e = edits[r.source.id] ?? {}
    return {
      title: e.title ?? r.title,
      category: e.category ?? r.category,
      parish: e.parish ?? r.parish,
      type: e.type ?? r.type,
      reward: e.reward ?? r.reward,
      schedule: e.schedule ?? r.schedule,
    }
  }

  function patch(id: string, p: Partial<Edit>) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }))
  }

  async function post(r: ScrapedQuest) {
    const c = current(r)
    if (!c.title.trim()) {
      notify('Add a title', 'This quest needs a name before it can go on the board.')
      return
    }
    setBusy((prev) => new Set(prev).add(r.source.id))
    try {
      await createQuest({
        poster_id: meId,
        title: c.title.trim(),
        description: r.description,
        category: c.category,
        type: c.type,
        parish: c.parish,
        reward: Math.max(0, Math.round(c.reward)),
        xp_reward: xpForReward(c.reward),
        schedule: c.schedule.trim(),
        party_size: 1,
      })
      setPosted((prev) => new Set(prev).add(r.source.id))
      notify('Posted to the board!', `“${c.title.trim()}” is now live for doers.`)
    } catch (err) {
      notify('Could not post', (err as Error).message)
    } finally {
      setBusy((prev) => {
        const n = new Set(prev)
        n.delete(r.source.id)
        return n
      })
    }
  }

  async function postAll() {
    for (const r of pending) {
      // Sequential so toasts and RLS-checked inserts stay tidy.
      // eslint-disable-next-line no-await-in-loop
      await post(r)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 pt-10">
      {/* Header */}
      <div className="mb-8">
        <span className="pill bg-[#1877F2] text-white">
          <Facebook className="h-3.5 w-3.5" /> Facebook Import
        </span>
        <h1 className="display mt-3 text-[34px] font-semibold text-ink sm:text-[42px]">
          Turn “{GROUP_NAME}” into quests.
        </h1>
        <p className="mt-1.5 max-w-2xl text-[16px] text-ink-muted">
          Scan the group for people asking for a hand, and SideQuest drafts a ready-to-post
          quest for each one — category, parish, timing and a fair reward all filled in. Review,
          tweak, and post it to the board in a tap.
        </p>
      </div>

      {/* Idle: choose a source */}
      {phase === 'idle' && (
        <div className="card p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={scan}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-granite-200 bg-surface p-5 text-left transition hover:-translate-y-0.5 hover:border-clay-200 hover:shadow-float"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1877F2]/10 text-[#1877F2]">
                <ScanLine className="h-5.5 w-5.5" />
              </span>
              <div>
                <p className="text-[16px] font-semibold text-ink">Scan the group</p>
                <p className="mt-0.5 text-[13.5px] text-ink-muted">
                  Pull the latest posts from {GROUP_NAME} and find the ones asking for help.
                </p>
              </div>
            </button>

            <button
              onClick={() => setPasteOpen((v) => !v)}
              className={`group flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-float ${
                pasteOpen
                  ? 'border-clay-300 bg-clay-500/5'
                  : 'border-granite-200 bg-surface hover:border-clay-200'
              }`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-clay-500/12 text-clay-600 dark:text-clay-400">
                <ClipboardPaste className="h-5.5 w-5.5" />
              </span>
              <div>
                <p className="text-[16px] font-semibold text-ink">Paste posts</p>
                <p className="mt-0.5 text-[13.5px] text-ink-muted">
                  Copy real posts out of the group and drop them in — one per paragraph.
                </p>
              </div>
            </button>
          </div>

          <AnimatePresence>
            {pasteOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-5">
                  <textarea
                    rows={7}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    className="field resize-none font-mono text-[13px] leading-relaxed"
                    placeholder={
                      'Paste posts here, separated by a blank line. e.g.\n\nSarah Le Cornu — 21 July\nCan anyone recommend someone to mow my lawn in St Helier? Happy to pay!\n\nMike Renouf\nLooking for help moving a sofa this Saturday, will pay cash.'
                    }
                  />
                  <button onClick={analysePasted} className="btn-accent mt-3 py-2.5 text-[14px]">
                    <Wand2 className="h-4 w-4" /> Analyse pasted posts
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-5 border-t border-granite-100 pt-4 text-[12.5px] leading-relaxed text-ink-faint">
            Live scanning of a private group needs a logged-in member session, so the in-app
            demo uses a representative snapshot of {GROUP_NAME}. The headless{' '}
            <code className="rounded bg-granite-100 px-1">scripts/fb-scraper.mjs</code> can pull
            the real feed when given a session cookie. Imported quests credit the original poster
            and link back to their post; you become the point of contact on SideQuest.
          </p>
        </div>
      )}

      {/* Scanning */}
      {phase === 'scanning' && (
        <div className="card flex flex-col items-center gap-3 py-20 text-center">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-[#1877F2]/30"
              animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1877F2]/10 text-[#1877F2]">
              <ScanLine className="h-6 w-6" />
            </span>
          </div>
          <p className="text-[16px] font-semibold text-ink">Scanning {GROUP_NAME}…</p>
          <p className="text-[13.5px] text-ink-muted">Reading recent posts and spotting people who need a hand.</p>
        </div>
      )}

      {/* Results */}
      {phase === 'done' && (
        <>
          {/* Summary bar */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/10 bg-surface px-4 py-3 shadow-soft">
            <div className="flex flex-wrap items-center gap-2 text-[13.5px] text-ink-muted">
              <span className="pill bg-granite-100 text-ink-soft">
                <Facebook className="h-3.5 w-3.5 text-[#1877F2]" /> {results.length} posts scanned
              </span>
              <span className="pill bg-emerald-100 text-emerald-700">
                <Check className="h-3.5 w-3.5" /> {helpRequests.length} look like help requests
              </span>
              {posted.size > 0 && (
                <span className="pill bg-clay-50 text-clay-700">
                  {posted.size} posted
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={reset} className="btn-ghost py-2 text-[13.5px]">
                <RefreshCw className="h-4 w-4" /> Rescan
              </button>
              {pending.length > 0 && (
                <button onClick={postAll} className="btn-accent py-2 text-[13.5px]">
                  <Send className="h-4 w-4" /> Post all ({pending.length})
                </button>
              )}
            </div>
          </div>

          {helpRequests.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 py-16 text-center">
              <CircleSlash className="h-8 w-8 text-ink-faint" />
              <p className="text-[16px] font-semibold text-ink">No help requests found</p>
              <p className="max-w-sm text-[13.5px] text-ink-muted">
                None of the scanned posts looked like someone asking for a hand. Try pasting more posts.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {helpRequests
                  .filter((r) => !dismissed.has(r.source.id))
                  .map((r) => (
                    <QuestDraftCard
                      key={r.source.id}
                      r={r}
                      value={current(r)}
                      posted={posted.has(r.source.id)}
                      busy={busy.has(r.source.id)}
                      onChange={(p) => patch(r.source.id, p)}
                      onPost={() => post(r)}
                      onDismiss={() =>
                        setDismissed((prev) => new Set(prev).add(r.source.id))
                      }
                      onView={onGoToBoard}
                    />
                  ))}
              </AnimatePresence>
            </div>
          )}

          {/* Skipped, for transparency */}
          {skipped.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowSkipped((v) => !v)}
                className="flex w-full items-center justify-between rounded-2xl border border-granite-200 bg-surface px-4 py-3 text-left text-[13.5px] font-medium text-ink-soft transition hover:border-granite-300"
              >
                <span className="inline-flex items-center gap-2">
                  <CircleSlash className="h-4 w-4 text-ink-faint" />
                  {skipped.length} posts skipped (not help requests)
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-ink-faint transition-transform ${showSkipped ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence>
                {showSkipped && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pt-2">
                      {skipped.map((r) => (
                        <div
                          key={r.source.id}
                          className="rounded-xl border border-granite-100 bg-granite-50 px-4 py-3"
                        >
                          <p className="text-[13px] text-ink-soft">
                            <span className="font-semibold">{r.source.author}:</span>{' '}
                            {truncate(r.source.text, 120)}
                          </p>
                          <p className="mt-1 text-[12px] text-ink-faint">{r.reasons[0]}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── One drafted quest card ────────────────────────────────────────────────────

function QuestDraftCard({
  r,
  value,
  posted,
  busy,
  onChange,
  onPost,
  onDismiss,
  onView,
}: {
  r: ScrapedQuest
  value: Edit
  posted: boolean
  busy: boolean
  onChange: (p: Partial<Edit>) => void
  onPost: () => void
  onDismiss: () => void
  onView: () => void
}) {
  const CatIcon = iconForCategory(value.category)
  const xp = xpForReward(value.reward)
  const when = formatWhen(r.source.postedAt)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={`card overflow-hidden p-0 ${posted ? 'opacity-70' : ''}`}
    >
      {/* Original post */}
      <div className="border-b border-granite-100 bg-granite-50 p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink">
            <Facebook className="h-4 w-4 text-[#1877F2]" />
            {r.source.author}
          </span>
          <div className="flex items-center gap-1.5">
            <ConfidenceBadge c={r.confidence} />
            {when && <span className="text-[12px] text-ink-faint">{when}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Quote className="h-4 w-4 shrink-0 text-ink-faint" />
          <p className="text-[13.5px] leading-relaxed text-ink-soft">{r.source.text}</p>
        </div>
      </div>

      {/* Drafted quest */}
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            Drafted quest
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {r.reasons.slice(0, 2).map((why) => (
              <span key={why} className="rounded-full bg-granite-100 px-2 py-0.5 text-[11px] text-ink-muted">
                {why}
              </span>
            ))}
          </div>
        </div>

        <input
          value={value.title}
          onChange={(e) => onChange({ title: e.target.value })}
          disabled={posted}
          className="field mb-3 text-[15px] font-semibold"
          placeholder="Quest title"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Labelled label="Category">
            <div className="relative">
              <CatIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <select
                value={value.category}
                onChange={(e) => onChange({ category: e.target.value })}
                disabled={posted}
                className="field cursor-pointer pl-9"
              >
                {questCategories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </Labelled>

          <Labelled label="Parish Guild">
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-jersey-500" />
              <select
                value={value.parish}
                onChange={(e) => onChange({ parish: e.target.value })}
                disabled={posted}
                className="field cursor-pointer pl-9"
              >
                <option value="">Jersey (unspecified)</option>
                {parishes.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
          </Labelled>

          <Labelled label="Reward (£)">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint">£</span>
              <input
                type="number"
                min={0}
                value={value.reward}
                onChange={(e) => onChange({ reward: Number(e.target.value) })}
                disabled={posted}
                className="field pl-7"
              />
            </div>
          </Labelled>

          <Labelled label="When">
            <input
              value={value.schedule}
              onChange={(e) => onChange({ schedule: e.target.value })}
              disabled={posted}
              className="field"
              placeholder="e.g. Sat morning · or “Every week”"
            />
          </Labelled>
        </div>

        {/* Type + worth */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-granite-200 p-0.5">
            {(['single', 'weekly'] as QuestType[]).map((t) => (
              <button
                key={t}
                type="button"
                disabled={posted}
                onClick={() => onChange({ type: t })}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition ${
                  value.type === t ? 'bg-jersey-600 text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {t === 'weekly' && <Repeat className="h-3.5 w-3.5" />}
                {t === 'single' ? 'Single-time' : 'Weekly'}
              </button>
            ))}
          </div>
          <span className="pill bg-clay-50 text-clay-700">
            <Coins className="h-3.5 w-3.5" /> £{value.reward}
          </span>
          <span className="pill bg-granite-100 text-ink-soft">
            <Sparkles className="h-3.5 w-3.5" /> +{xp} XP
          </span>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2 border-t border-granite-100 pt-4">
          {posted ? (
            <>
              <span className="pill bg-emerald-100 text-emerald-700">
                <Check className="h-3.5 w-3.5" /> Posted to the board
              </span>
              <button onClick={onView} className="btn-ghost ml-auto py-2 text-[13.5px]">
                View on board
              </button>
            </>
          ) : (
            <>
              <button onClick={onPost} disabled={busy} className="btn-accent py-2.5 text-[14px]">
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Post to board
                  </>
                )}
              </button>
              <button onClick={onDismiss} disabled={busy} className="btn-ghost py-2.5 text-[14px]">
                <X className="h-4 w-4" /> Dismiss
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function ConfidenceBadge({ c }: { c: Confidence }) {
  const map: Record<Confidence, { label: string; cls: string }> = {
    high: { label: 'High confidence', cls: 'bg-emerald-100 text-emerald-700' },
    medium: { label: 'Likely', cls: 'bg-amber-100 text-amber-700' },
    low: { label: 'Maybe', cls: 'bg-granite-100 text-ink-muted' },
  }
  const { label, cls } = map[c]
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{label}</span>
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n).trim() + '…' : s
}

function formatWhen(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
