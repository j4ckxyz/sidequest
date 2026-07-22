import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import type { Message } from '../../types/models';
import { MessageBubble } from './MessageBubble';
import { Button } from '../ui/Button';

export function ChatThread({ messages, currentUserId, onSend, isSending }: { messages: Message[]; currentUserId: string; onSend: (body: string) => void; isSending?: boolean }) {
  const [body, setBody] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    onSend(body.trim());
    setBody('');
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} isOwn={m.sender_id === currentUserId} />
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border p-3">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          className="h-11 flex-1 rounded-lg border border-border bg-surface px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
        />
        <Button type="submit" size="md" disabled={!body.trim()} isLoading={isSending} className="shrink-0 !px-3">
          <Send size={17} />
        </Button>
      </form>
    </div>
  );
}
