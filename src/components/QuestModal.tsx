import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X,
  MapPin,
  CalendarClock,
  Coins,
  Sparkles,
  Users,
  Bus,
  Repeat,
  Check,
  ShieldCheck,
  MessageCircle,
} from 'lucide-react'
import type { Quest } from '../lib/types'
import { iconForCategory, gradientFor, initialsOf } from '../lib/constants'
import Avatar from './Avatar'
import Chat from './Chat'

interface Me {
  id: string
  name: string
  role: 'doer' | 'poster'
}

export default function QuestModal({
  quest,
  me,
  applied,
  onApply,
  onClose,
}: {
  quest: Quest | null
  me: Me
  applied: boolean
  onApply: (message: string) => Promise<void>
  onClose: () => void
}) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [showChat, setShowChat] = useState(false)

  if (!quest) return null

  const owns = me.role === 'poster' && quest.poster_id === me.id
  const canChat = owns || (me.role === 'doer' && applied)
  const spotsLeft = Math.max(0, quest.party_size - quest.accepted_count)
  const perDoer = quest.party_size > 1 ? Math.round(quest.reward / quest.party_size) : quest.reward
  const CatIcon = iconForCategory(quest.category)

  async function handleApply() {
    setBusy(true)
    try {
      await onApply(note.trim())
    } finally {
      setBusy(false)
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
          className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-4xl bg-white shadow-float sm:rounded-4xl"
        >
          {/* Header */}
          <div className="relative overflow-hidden px-7 pb-6 pt-8">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-jersey-500 to-jersey-700 opacity-[0.1]" />
            <button
              onClick={onClose}
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-ink-muted shadow-soft backdrop-blur transition hover:text-ink"
              aria-label="Close"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="pill bg-white text-ink-soft shadow-soft">
                <CatIcon className="h-3.5 w-3.5" /> {quest.category}
              </span>
              <span
                className={`pill ${
                  quest.type === 'weekly'
                    ? 'bg-jersey-100 text-jersey-700'
                    : 'bg-granite-100 text-ink-muted'
                }`}
              >
                {quest.type === 'weekly' ? (
                  <>
                    <Repeat className="h-3 w-3" /> Weekly
                  </>
                ) : (
                  'Single-time'
                )}
              </span>
              {quest.bus_friendly && (
                <span className="pill bg-emerald-100 text-emerald-700">
                  <Bus className="h-3 w-3" /> Bus friendly
                </span>
              )}
            </div>

            <h2 className="mt-3 text-[26px] font-semibold leading-tight tracking-tight text-ink">
              {quest.title}
            </h2>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-jersey-500" /> {quest.parish || 'Jersey'} Guild
              </span>
              {quest.schedule && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4 text-jersey-500" /> {quest.schedule}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                Posted by <strong className="text-ink-soft">{quest.poster?.name ?? 'A local'}</strong>
                {quest.poster?.community_verified && (
                  <ShieldCheck className="h-3.5 w-3.5 text-jersey-600" aria-label="Community Verified" />
                )}
              </span>
            </div>
          </div>

          <div className="space-y-6 px-7 pb-7">
            {/* Reward + XP + party */}
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat icon={Coins} tint="text-jersey-600" label="Reward" value={`£${quest.reward}`}
                sub={quest.party_size > 1 ? `£${perDoer} each` : undefined} />
              <Stat icon={Sparkles} tint="text-clay-600" label="XP reward" value={`+${quest.xp_reward}`} />
              <Stat icon={Users} tint="text-ink" label="Party"
                value={`${quest.accepted_count}/${quest.party_size}`}
                sub={spotsLeft > 0 ? `${spotsLeft} slot${spotsLeft === 1 ? '' : 's'} left` : 'Full'} />
            </div>

            {/* Party pips */}
            {quest.party_size > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-ink-faint">Quest Party:</span>
                <div className="flex gap-1.5">
                  {Array.from({ length: quest.party_size }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-3 w-6 rounded-full ${
                        i < quest.accepted_count ? 'bg-jersey-600' : 'bg-granite-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {quest.description && (
              <div>
                <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
                  The quest
                </p>
                <p className="text-[15px] leading-relaxed text-ink-muted">{quest.description}</p>
              </div>
            )}

            {/* Doer apply block */}
            {me.role === 'doer' && !applied && (
              <div className="rounded-2xl border border-granite-200 bg-granite-50/60 p-4">
                <p className="mb-2 text-[13px] font-medium text-ink-soft">
                  Add a note for the poster (optional)
                </p>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. I’ve done loads of garden work and I’m on the 15 bus route!"
                  className="field resize-none"
                />
              </div>
            )}

            {/* Chat */}
            {canChat && (
              <div>
                <button
                  onClick={() => setShowChat((v) => !v)}
                  className="mb-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-jersey-600 hover:text-jersey-800"
                >
                  <MessageCircle className="h-4 w-4" />
                  {showChat ? 'Hide Safe-Chat' : 'Open Safe-Chat'}
                </button>
                {showChat && <Chat questId={quest.id} meId={me.id} meName={me.name} />}
              </div>
            )}
          </div>

          {/* Action bar */}
          {me.role === 'doer' && (
            <div className="sticky bottom-0 flex items-center gap-3 border-t border-granite-200 bg-white/85 px-7 py-4 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <Avatar
                  initials={initialsOf(quest.poster?.name ?? '?')}
                  gradient={gradientFor(quest.poster_id)}
                  size="sm"
                />
                <div className="hidden sm:block">
                  <p className="text-[13px] font-semibold text-ink">{quest.poster?.name}</p>
                  <p className="text-[11px] text-ink-faint">
                    {quest.poster?.kind === 'business' ? 'Small business' : 'Resident'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleApply}
                disabled={applied || busy || spotsLeft === 0}
                className={`ml-auto min-w-[180px] py-3 text-[15px] ${
                  applied ? 'btn bg-emerald-500 text-white' : 'btn-accent'
                }`}
              >
                {applied ? (
                  <>
                    <Check className="h-4.5 w-4.5" strokeWidth={3} /> Applied
                  </>
                ) : spotsLeft === 0 ? (
                  'Party full'
                ) : (
                  <>Accept quest · +{quest.xp_reward} XP</>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function Stat({
  icon: Icon,
  tint,
  label,
  value,
  sub,
}: {
  icon: typeof Coins
  tint: string
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-2xl border border-granite-200 bg-white p-3.5 text-center">
      <Icon className={`mx-auto mb-1 h-5 w-5 ${tint}`} />
      <div className="text-[20px] font-bold tracking-tight text-ink">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] text-ink-muted">{sub}</div>}
    </div>
  )
}
