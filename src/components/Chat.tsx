import { useEffect, useRef, useState } from 'react'
import { Send, ShieldCheck, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { listMessages, sendMessage } from '../lib/db'
import { gradientFor, initialsOf } from '../lib/constants'
import type { Message } from '../lib/types'
import Avatar from './Avatar'

export default function Chat({
  questId,
  doerId,
  meId,
  meName,
}: {
  questId: string
  doerId: string
  meId: string
  meName: string
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    listMessages(questId, doerId)
      .then((m) => alive && setMessages(m))
      .finally(() => alive && setLoading(false))

    const channel = supabase
      .channel(`quest-chat-${questId}-${doerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `quest_id=eq.${questId}` },
        (payload) => {
          const msg = payload.new as Message
          if (msg.doer_id !== doerId) return
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
        },
      )
      .subscribe()

    return () => {
      alive = false
      supabase.removeChannel(channel)
    }
  }, [questId, doerId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if (!body) return
    setSending(true)
    setDraft('')
    try {
      await sendMessage(questId, doerId, meId, meName, body)
    } catch {
      setDraft(body)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center gap-1.5 rounded-xl bg-clay-500/10 px-3 py-2 text-[12px] font-medium text-clay-700 dark:text-clay-300">
        <ShieldCheck className="h-3.5 w-3.5" />
        Safe-Chat — keep it on-platform. No phone numbers needed.
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-line/10 bg-granite-50/60 p-3"
        style={{ minHeight: 200, maxHeight: 340 }}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-[13px] text-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading chat…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 py-8 text-center text-[13px] text-ink-muted">
            <p className="font-medium text-ink">No messages yet</p>
            <p>Say hello and sort out the details.</p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === meId
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                <Avatar
                  initials={initialsOf(m.sender_name || '?')}
                  gradient={gradientFor(m.sender_id)}
                  size="sm"
                />
                <div className={`max-w-[75%] ${mine ? 'items-end text-right' : ''}`}>
                  <div
                    className={`inline-block rounded-2xl px-3.5 py-2 text-[14px] leading-snug ${
                      mine
                        ? 'rounded-tr-sm bg-clay-600 text-white'
                        : 'rounded-tl-sm border border-line/10 bg-surface text-ink-soft'
                    }`}
                  >
                    {m.body}
                  </div>
                  <p className="mt-0.5 px-1 text-[11px] text-ink-faint">
                    {mine ? 'You' : m.sender_name} ·{' '}
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <form onSubmit={submit} className="mt-2 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          className="field py-2.5"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="btn-accent shrink-0 px-3.5 py-2.5"
          aria-label="Send"
        >
          {sending ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Send className="h-4.5 w-4.5" />}
        </button>
      </form>
    </div>
  )
}
