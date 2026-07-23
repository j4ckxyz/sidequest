import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Compass, Send, Sparkles, Trash2 } from 'lucide-react';
import {
  useClearJobPreferenceChat,
  useJobPreferences,
  useSendJobPreferenceMessage,
} from '../../hooks/useJobPreferences';
import { cx } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Label } from '../ui/Input';
import { Kbd } from '../ui/Kbd';
import { Textarea } from '../ui/Textarea';
import type { JobPreferenceMessage } from '../../types/models';

const STARTERS = [
  'I like practical outdoor jobs and I’m usually free at weekends.',
  'I want quiet jobs I can do from home or nearby.',
  'I’m happy lifting and moving things, but I don’t want childcare.',
];

/**
 * Self-contained private preference chat + saved brief. Used both on Settings and
 * during onboarding. Manages its own data hooks so callers just pass the user id.
 */
export function PreferenceAgent({ userId }: { userId: string }) {
  const preferenceQuery = useJobPreferences(userId);
  const sendMessage = useSendJobPreferenceMessage(userId);
  const clearChat = useClearJobPreferenceChat(userId);
  const state = preferenceQuery.data;
  const messages = state?.messages ?? [];

  const [draft, setDraft] = useState('');
  const conversationEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0 || sendMessage.isPending) {
      conversationEnd.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [sendMessage.isPending, messages.length]);

  async function send() {
    const message = draft.trim();
    if (!message || sendMessage.isPending) return;
    try {
      await sendMessage.mutateAsync(message);
      setDraft('');
    } catch {
      // error rendered below; keep the draft for retry
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send();
  }

  return (
    <section className="glass-card overflow-hidden rounded-2xl border border-border">
      <div className="border-b border-border bg-[linear-gradient(135deg,var(--color-primary-soft),var(--color-surface)_62%)] px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary shadow-sm">
              <Sparkles size={19} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">Talk through the jobs you want</h2>
              <p className="mt-1 text-sm leading-5 text-text-muted">
                A quick private chat becomes a matching brief you can keep correcting later.
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Clear this chat and its saved brief?')) clearChat.mutate();
              }}
              disabled={clearChat.isPending}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface/80 px-2.5 py-1.5 text-xs text-text-muted hover:text-danger disabled:opacity-50"
            >
              <Trash2 size={13} /> Clear chat
            </button>
          )}
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.3fr)_minmax(14rem,0.7fr)]">
        <div className="flex min-h-[24rem] flex-col border-border xl:min-h-[32rem] xl:border-r">
          <div className="max-h-[22rem] flex-1 space-y-3 overflow-y-auto px-5 py-5 xl:max-h-[26rem]" aria-live="polite">
            <ChatBubble
              message={{
                id: 'welcome',
                role: 'assistant',
                content:
                  messages.length > 0
                    ? 'Welcome back. Tell me what has changed and I’ll update your job compass.'
                    : 'What sort of jobs would make you think “yes, I’d actually do that”? You can be as specific or casual as you like.',
                created_at: '',
              }}
            />
            {preferenceQuery.isLoading && <p className="text-sm text-text-muted">Loading your private conversation…</p>}
            {preferenceQuery.error && <p className="text-sm text-danger">{preferenceQuery.error.message}</p>}
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
            {sendMessage.isPending && (
              <div className="w-fit rounded-2xl rounded-bl-sm bg-surface-2 px-3.5 py-2.5 text-sm text-text-muted">
                Updating your job compass…
              </div>
            )}
            <div ref={conversationEnd} />
          </div>

          {messages.length === 0 && !preferenceQuery.isLoading && (
            <div className="flex gap-2 overflow-x-auto px-5 pb-3">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => setDraft(starter)}
                  className="shrink-0 rounded-full border border-border bg-canvas px-3 py-1.5 text-xs text-text-muted hover:border-primary/40 hover:text-text"
                >
                  {starter.split('.')[0]}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="border-t border-border p-4 sm:p-5">
            <Label htmlFor="preference-message" hint={`${draft.length}/1000`}>
              Tell the job compass
            </Label>
            <div className="flex items-end gap-2">
              <Textarea
                id="preference-message"
                rows={3}
                maxLength={1000}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                placeholder="e.g. I can drive anywhere on the island, prefer mornings, and love jobs involving animals…"
                className="min-h-24 resize-none"
              />
              <Button type="submit" aria-label="Send preference message" disabled={!draft.trim()} isLoading={sendMessage.isPending} className="h-12 w-12 shrink-0 px-0">
                <Send size={17} />
              </Button>
            </div>
            {sendMessage.error && <p className="mt-2 text-sm text-danger">{sendMessage.error.message}</p>}
            <p className="mt-2 hidden items-center gap-1.5 text-xs text-text-muted sm:flex">
              <Kbd>Enter</Kbd> to send
              <span className="text-text-muted/60">·</span>
              <Kbd>⇧</Kbd>
              <Kbd>Enter</Kbd> for a new line
            </p>
            <p className="mt-2 text-xs leading-5 text-text-muted">
              Your brief is private. New recommendations usually settle within two minutes.
            </p>
          </form>
        </div>

        <aside className="border-t border-border bg-canvas/45 p-5 xl:border-t-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-text">
            <Compass size={16} className="text-primary" /> Your saved brief
          </div>
          {state?.summary ? (
            <>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text">{state.summary}</p>
              {state.keywords.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {state.keywords.map((keyword) => (
                    <span key={keyword} className="rounded-full bg-surface-2 px-2 py-1 text-xs text-text-muted">
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-4 text-xs leading-5 text-text-muted">
                This replaces itself as you correct it, so old preferences don’t linger.
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-text-muted">
              Your concise matching brief will appear here after the first message.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}

function ChatBubble({ message }: { message: JobPreferenceMessage }) {
  const fromUser = message.role === 'user';
  return (
    <div
      className={cx(
        'max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6',
        fromUser ? 'ml-auto rounded-br-sm bg-primary text-on-primary' : 'rounded-bl-sm bg-surface-2 text-text',
      )}
    >
      {message.content}
    </div>
  );
}
