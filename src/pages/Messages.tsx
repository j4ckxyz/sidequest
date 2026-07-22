import { useEffect, useMemo, useState } from 'react'
import { Loader2, MessagesSquare, ArrowLeft, Compass } from 'lucide-react'
import { gradientFor, initialsOf } from '../lib/constants'
import type { Message } from '../lib/types'
import {
  applicationsForQuests,
  myApplications,
  myMessages,
  myQuests,
} from '../lib/db'
import { useToast } from '../components/Toast'
import type { ChatTarget } from '../context/ChatContext'
import Avatar from '../components/Avatar'
import Chat from '../components/Chat'

interface Conv {
  key: string
  questId: string
  questTitle: string
  doerId: string
  otherName: string
  last?: Message
}

const keyOf = (questId: string, doerId: string) => `${questId}|${doerId}`

export default function Messages({
  meId,
  meName,
  initial,
  onConsumed,
}: {
  meId: string
  meName: string
  initial: ChatTarget | null
  onConsumed: () => void
}) {
  const { notify } = useToast()
  const [convs, setConvs] = useState<Conv[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [apps, mine, msgs] = await Promise.all([
          myApplications(meId),
          myQuests(meId),
          myMessages(),
        ])
        const titleMap = new Map(mine.map((q) => [q.id, q.title]))
        const posterApps = await applicationsForQuests(mine.map((q) => q.id))

        const lastByKey = new Map<string, Message>()
        for (const m of msgs) {
          const k = keyOf(m.quest_id, m.doer_id)
          if (!lastByKey.has(k)) lastByKey.set(k, m) // msgs are newest-first
        }

        const map = new Map<string, Conv>()
        // Threads where I'm the doer
        for (const a of apps) {
          const k = keyOf(a.quest_id, meId)
          map.set(k, {
            key: k,
            questId: a.quest_id,
            questTitle: a.quest?.title ?? 'Quest',
            doerId: meId,
            otherName: a.quest?.poster?.name ?? 'Quest poster',
          })
        }
        // Threads where I'm the poster (one per applicant)
        for (const pa of posterApps) {
          const k = keyOf(pa.quest_id, pa.doer_id)
          map.set(k, {
            key: k,
            questId: pa.quest_id,
            questTitle: titleMap.get(pa.quest_id) ?? 'Quest',
            doerId: pa.doer_id,
            otherName: pa.doer?.name ?? 'Adventurer',
          })
        }
        for (const c of map.values()) c.last = lastByKey.get(c.key)

        const list = Array.from(map.values()).sort((a, b) => {
          const ta = a.last ? new Date(a.last.created_at).getTime() : 0
          const tb = b.last ? new Date(b.last.created_at).getTime() : 0
          return tb - ta
        })
        if (alive) setConvs(list)
      } catch (e) {
        notify('Could not load messages', (e as Error).message)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [meId, notify])

  // Honour a conversation requested from elsewhere (e.g. a quest window).
  useEffect(() => {
    if (!initial) return
    const k = keyOf(initial.questId, initial.doerId)
    setConvs((prev) => {
      if (prev.some((c) => c.key === k)) return prev
      return [
        {
          key: k,
          questId: initial.questId,
          questTitle: initial.questTitle,
          doerId: initial.doerId,
          otherName: initial.otherName,
        },
        ...prev,
      ]
    })
    setSelectedKey(k)
    onConsumed()
  }, [initial, onConsumed])

  const selected = useMemo(
    () => convs.find((c) => c.key === selectedKey) ?? null,
    [convs, selectedKey],
  )

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-6">
        <span className="pill bg-jersey-600 text-white">
          <MessagesSquare className="h-3.5 w-3.5" /> Messages
        </span>
        <h1 className="display mt-3 text-[34px] font-semibold text-ink sm:text-[42px]">Chat</h1>
        <p className="mt-1.5 max-w-xl text-[16px] text-ink-muted">
          Every conversation from your quests, in one place. Coordinate safely — no phone
          numbers needed.
        </p>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center gap-2 py-24 text-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading conversations…
        </div>
      ) : convs.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-20 text-center">
          <MessagesSquare className="h-9 w-9 text-ink-faint" />
          <p className="text-[18px] font-semibold text-ink">No conversations yet</p>
          <p className="mx-auto max-w-sm text-[14px] text-ink-muted">
            Apply to a quest on the board, or accept an applicant on one of yours, to start
            a Safe-Chat.
          </p>
        </div>
      ) : (
        <div className="grid h-[68vh] gap-4 md:grid-cols-[330px_1fr]">
          {/* Conversation list */}
          <div className={`card overflow-y-auto p-2 ${selected ? 'hidden md:block' : 'block'}`}>
            {convs.map((c) => {
              const active = c.key === selectedKey
              return (
                <button
                  key={c.key}
                  onClick={() => setSelectedKey(c.key)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition ${
                    active ? 'bg-clay-500/12' : 'hover:bg-granite-100'
                  }`}
                >
                  <Avatar initials={initialsOf(c.otherName)} gradient={gradientFor(c.doerId + c.questId)} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink">{c.otherName}</p>
                    <p className="truncate text-[12px] text-ink-muted">
                      {c.last ? c.last.body : c.questTitle}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Chat pane */}
          <div className={`card flex flex-col p-4 ${selected ? 'flex' : 'hidden md:flex'}`}>
            {selected ? (
              <>
                <div className="mb-3 flex items-center gap-3 border-b border-line/10 pb-3">
                  <button
                    onClick={() => setSelectedKey(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-granite-100 md:hidden"
                    aria-label="Back"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <Avatar
                    initials={initialsOf(selected.otherName)}
                    gradient={gradientFor(selected.doerId + selected.questId)}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-ink">{selected.otherName}</p>
                    <p className="truncate text-[12px] text-ink-muted">{selected.questTitle}</p>
                  </div>
                </div>
                <div className="min-h-0 flex-1">
                  <Chat
                    key={selected.key}
                    questId={selected.questId}
                    doerId={selected.doerId}
                    meId={meId}
                    meName={meName}
                    fill
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-ink-muted">
                <Compass className="h-8 w-8 text-ink-faint" />
                <p className="text-[15px] font-medium text-ink">Pick a conversation</p>
                <p className="text-[13px]">Choose someone on the left to start chatting.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
