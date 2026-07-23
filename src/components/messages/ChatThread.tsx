import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import type { Message } from '../../types/models';
import { MessageBubble } from './MessageBubble';
import { Button } from '../ui/Button';

// Messages within this window from the same sender cluster into one group
// (single timestamp, tight spacing) — like most chat apps.
const CLUSTER_GAP_MS = 5 * 60 * 1000;

export function ChatThread({ messages, currentUserId, onSend, isSending }: { messages: Message[]; currentUserId: string; onSend: (body: string) => void; isSending?: boolean }) {
  const [body, setBody] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  // Auto-grow the composer downward as it wraps, capped so it never eats the thread.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [body]);

  function send() {
    const text = body.trim();
    if (!text) return;
    onSend(text);
    setBody('');
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    send();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-4 py-4">
        {messages.map((message, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const startsGroup =
            !prev || prev.sender_id !== message.sender_id || +new Date(message.created_at) - +new Date(prev.created_at) > CLUSTER_GAP_MS;
          const endsGroup =
            !next || next.sender_id !== message.sender_id || +new Date(next.created_at) - +new Date(message.created_at) > CLUSTER_GAP_MS;
          return (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === currentUserId}
              startsGroup={startsGroup}
              showTime={endsGroup}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={submit} className="flex items-end gap-2 border-t border-border p-3">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter drops a newline (grows the box downward).
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Write a message…"
          className="max-h-40 min-h-11 flex-1 resize-none rounded-lg border border-border bg-surface px-4 py-2.5 text-base leading-6 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <Button type="submit" size="md" disabled={!body.trim()} isLoading={isSending} className="h-11 shrink-0 !px-3">
          <Send size={17} />
        </Button>
      </form>
    </div>
  );
}
