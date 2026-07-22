import { useState } from 'react'
import { motion } from 'framer-motion'
import { PlusCircle, Loader2, Coins, Sparkles, Bus, Users } from 'lucide-react'
import { parishes, questCategories, categoryEmoji, xpForReward } from '../lib/constants'
import type { QuestType } from '../lib/types'
import { createQuest } from '../lib/db'
import { useToast } from '../components/Toast'

export default function PostQuest({
  meId,
  onPosted,
}: {
  meId: string
  onPosted: () => void
}) {
  const { notify } = useToast()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>('Gardening')
  const [type, setType] = useState<QuestType>('single')
  const [parish, setParish] = useState<string>('St Helier')
  const [reward, setReward] = useState(15)
  const [schedule, setSchedule] = useState('')
  const [busFriendly, setBusFriendly] = useState(false)
  const [partySize, setPartySize] = useState(1)
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  const xp = xpForReward(reward)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      notify('Add a title', 'Every quest needs a name.')
      return
    }
    setBusy(true)
    try {
      await createQuest({
        poster_id: meId,
        title: title.trim(),
        description: description.trim(),
        category,
        type,
        parish,
        reward: Math.max(0, Math.round(reward)),
        xp_reward: xp,
        schedule: schedule.trim(),
        bus_friendly: busFriendly,
        party_size: Math.max(1, partySize),
      })
      notify('Quest posted!', 'It’s live on the board for doers to grab.')
      onPosted()
    } catch (err) {
      notify('Could not post', (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-8">
        <span className="pill bg-jersey-600 text-white">
          <PlusCircle className="h-3.5 w-3.5" /> Post a Quest
        </span>
        <h1 className="mt-3 text-[34px] font-semibold tracking-tight text-ink sm:text-[42px]">
          Need a hand? Post a quest.
        </h1>
        <p className="mt-1.5 max-w-xl text-[16px] text-ink-muted">
          Describe the job, set a reward, and local adventurers will apply. Set a party
          size for bigger tasks.
        </p>
      </div>

      <form onSubmit={submit} className="card space-y-5 p-6 sm:p-7">
        <L label="Quest title">
          <input
            className="field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Mow the front lawn this Saturday"
          />
        </L>

        <div className="grid gap-4 sm:grid-cols-2">
          <L label="Category">
            <select className="field cursor-pointer" value={category} onChange={(e) => setCategory(e.target.value)}>
              {questCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </L>
          <L label="Parish Guild">
            <select className="field cursor-pointer" value={parish} onChange={(e) => setParish(e.target.value)}>
              {parishes.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </L>
        </div>

        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">Quest type</span>
          <div className="grid grid-cols-2 gap-2.5">
            {(
              [
                { t: 'single' as QuestType, label: 'Single-time', sub: 'A one-off job' },
                { t: 'weekly' as QuestType, label: 'Weekly', sub: 'Repeats each week' },
              ]
            ).map((o) => (
              <button
                key={o.t}
                type="button"
                onClick={() => setType(o.t)}
                className={`rounded-2xl border p-3.5 text-left transition ${
                  type === o.t
                    ? 'border-jersey-400 bg-jersey-50 ring-4 ring-jersey-500/10'
                    : 'border-granite-200 bg-white hover:border-granite-300'
                }`}
              >
                <span className="text-[14px] font-semibold text-ink">{o.label}</span>
                <span className="block text-[12px] text-ink-muted">{o.sub}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <L label="Reward (£)">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint">£</span>
              <input
                type="number"
                min={0}
                className="field pl-8"
                value={reward}
                onChange={(e) => setReward(Number(e.target.value))}
              />
            </div>
          </L>
          <L label="When">
            <input
              className="field"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="e.g. Sat 12 Jul, 2pm · or “Every Wednesday”"
            />
          </L>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <L label="Party size">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={6}
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
                className="flex-1 accent-jersey-600"
              />
              <span className="inline-flex items-center gap-1 rounded-full bg-granite-100 px-3 py-1 text-[13px] font-semibold text-ink">
                <Users className="h-3.5 w-3.5" /> {partySize}
              </span>
            </div>
          </L>
          <label className="flex cursor-pointer items-end pb-1">
            <span className="flex items-center gap-2.5">
              <span
                onClick={() => setBusFriendly((v) => !v)}
                role="switch"
                aria-checked={busFriendly}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                  busFriendly ? 'bg-emerald-500' : 'bg-granite-300'
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    busFriendly ? 'left-6' : 'left-1'
                  }`}
                />
              </span>
              <span className="inline-flex items-center gap-1 text-[14px] font-medium text-ink-soft">
                <Bus className="h-4 w-4 text-emerald-600" /> Bus route friendly
              </span>
            </span>
          </label>
        </div>

        <L label="Description">
          <textarea
            rows={4}
            className="field resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What needs doing? Any tools provided? What does ‘done’ look like?"
          />
        </L>

        {/* Live preview of rewards */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-granite-50 px-4 py-3">
          <span className="text-[13px] text-ink-muted">This quest is worth</span>
          <span className="pill bg-jersey-50 text-jersey-700">
            <Coins className="h-3.5 w-3.5" /> £{reward}
            {partySize > 1 ? ` · £${Math.round(reward / partySize)} each` : ''}
          </span>
          <span className="pill bg-gold-400/20 text-gold-600">
            <Sparkles className="h-3.5 w-3.5" /> +{xp} XP
          </span>
          <span className="pill bg-white text-ink-muted">
            {categoryEmoji[category]} {category}
          </span>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={busy}
          className="btn-accent w-full py-3.5 text-[15px]"
        >
          {busy ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <><PlusCircle className="h-4.5 w-4.5" /> Post quest to the board</>}
        </motion.button>
      </form>
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
