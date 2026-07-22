import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AtSign,
  Check,
  Compass,
  LockKeyhole,
  MapPinOff,
  Send,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useToast } from '../context/ToastProvider';
import {
  useJobPreferences,
  useSendJobPreferenceMessage,
  useUpdateJobPreferences,
} from '../hooks/useJobPreferences';
import { JOB_CATEGORIES } from '../lib/constants';
import { db } from '../lib/db';
import { cx } from '../lib/utils';
import { CategoryIcon } from '../components/jobs/CategoryIcon';
import { Button } from '../components/ui/Button';
import { FieldError, Input, Label } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import type { JobPreferenceMessage, JobPreferenceState } from '../types/models';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const STARTERS = [
  'I like practical outdoor jobs and I’m usually free at weekends.',
  'I want quiet jobs I can do from home or nearby.',
  'I’m happy lifting and moving things, but I don’t want childcare.',
];

export function Settings() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const userId = user?.id ?? '';
  const preferenceQuery = useJobPreferences(user?.id);
  const updatePreferences = useUpdateJobPreferences(userId);
  const sendPreferenceMessage = useSendJobPreferenceMessage(userId);
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [hideLocation, setHideLocation] = useState(user?.hide_location ?? false);
  const [didHydrate, setDidHydrate] = useState(false);

  useEffect(() => {
    if (!preferenceQuery.data || didHydrate) return;
    setPreferredCategories(preferenceQuery.data.preferred_categories);
    setHideLocation(user?.hide_location ?? false);
    setDidHydrate(true);
  }, [didHydrate, preferenceQuery.data, user?.hide_location]);

  if (!user) return null;

  function toggleCategory(slug: string) {
    setPreferredCategories((current) =>
      current.includes(slug) ? current.filter((category) => category !== slug) : [...current, slug],
    );
  }

  function saveMatchingPreferences() {
    updatePreferences.mutate(
      { preferredCategories, hideLocation },
      {
        onSuccess: () => showToast('Job preferences saved.'),
        onError: (error) => showToast(error instanceof Error ? error.message : 'Could not save preferences.', 'error'),
      },
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-12">
      <header className="max-w-2xl">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Compass size={17} /> Your job compass
        </div>
        <h1 className="mt-2 text-3xl text-text sm:text-4xl">Make SideQuest feel like your island.</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted sm:text-base">
          Choose what suits you, keep your whereabouts private, and tell the matcher what a good job actually looks like.
        </p>
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.35fr)]">
        <div className="flex flex-col gap-6">
          <UsernameSection key={user.username} current={user.username} />

          <section className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sage-soft text-sage">
                <LockKeyhole size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-text">Location privacy</h2>
                <p className="mt-1 text-sm leading-5 text-text-muted">
                  Your parish can help rank nearby work without appearing to other people.
                </p>
              </div>
            </div>
            <label className="mt-4 flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border bg-canvas/60 p-3.5">
              <span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-text">
                  <MapPinOff size={15} /> Hide my parish
                </span>
                <span className="mt-1 block text-xs leading-5 text-text-muted">
                  It stays available only to you, admins, and the matching service.
                </span>
              </span>
              <input
                type="checkbox"
                checked={hideLocation}
                onChange={(event) => setHideLocation(event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-border accent-primary"
              />
            </label>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-text">Preferred job topics</h2>
                <p className="mt-1 text-sm text-text-muted">Pick as many as you’d genuinely consider.</p>
              </div>
              {preferredCategories.length > 0 && (
                <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                  {preferredCategories.length} picked
                </span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {JOB_CATEGORIES.map((category) => {
                const selected = preferredCategories.includes(category.slug);
                return (
                  <button
                    key={category.slug}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleCategory(category.slug)}
                    className={cx(
                      'flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                      selected
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-border bg-canvas/50 text-text-muted hover:border-primary/40 hover:text-text',
                    )}
                  >
                    <CategoryIcon name={category.icon} size={15} />
                    <span className="min-w-0 flex-1 leading-tight">{category.label}</span>
                    {selected && <Check size={14} className="shrink-0" />}
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              className="mt-4 w-full"
              isLoading={updatePreferences.isPending}
              disabled={!didHydrate && preferenceQuery.isLoading}
              onClick={saveMatchingPreferences}
            >
              Save topics & privacy
            </Button>
          </section>
        </div>

        <PreferenceAgent
          state={preferenceQuery.data}
          isLoading={preferenceQuery.isLoading}
          loadError={preferenceQuery.error}
          isSending={sendPreferenceMessage.isPending}
          sendError={sendPreferenceMessage.error}
          onSend={(message) => sendPreferenceMessage.mutateAsync(message).then(() => undefined)}
        />
      </div>
    </div>
  );
}

function PreferenceAgent({
  state,
  isLoading,
  loadError,
  isSending,
  sendError,
  onSend,
}: {
  state: JobPreferenceState | undefined;
  isLoading: boolean;
  loadError: Error | null;
  isSending: boolean;
  sendError: Error | null;
  onSend: (message: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState('');
  const conversationEnd = useRef<HTMLDivElement>(null);
  const messages = state?.messages ?? [];

  useEffect(() => {
    if (messages.length > 0 || isSending) {
      conversationEnd.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [isSending, messages.length]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || isSending) return;
    try {
      await onSend(message);
      setDraft('');
    } catch {
      // The mutation error is rendered below; keep the draft so it can be retried.
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_18px_55px_-40px_rgba(30,36,43,0.65)] lg:sticky lg:top-24">
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
          <span className="hidden shrink-0 rounded-full border border-border bg-surface/80 px-2.5 py-1 text-xs text-text-muted sm:block">
            {state ? `${state.remaining_today}/${state.daily_limit} today` : 'Private'}
          </span>
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
            {isLoading && <p className="text-sm text-text-muted">Loading your private conversation…</p>}
            {loadError && <p className="text-sm text-danger">{loadError.message}</p>}
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
            {isSending && (
              <div className="w-fit rounded-2xl rounded-bl-sm bg-surface-2 px-3.5 py-2.5 text-sm text-text-muted">
                Updating your job compass…
              </div>
            )}
            <div ref={conversationEnd} />
          </div>

          {messages.length === 0 && !isLoading && (
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
                placeholder="e.g. I can drive anywhere on the island, prefer mornings, and love jobs involving animals…"
                className="min-h-24 resize-none"
              />
              <Button type="submit" aria-label="Send preference message" disabled={!draft.trim()} isLoading={isSending} className="h-12 w-12 shrink-0 px-0">
                <Send size={17} />
              </Button>
            </div>
            {sendError && <p className="mt-2 text-sm text-danger">{sendError.message}</p>}
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
        fromUser
          ? 'ml-auto rounded-br-sm bg-primary text-on-primary'
          : 'rounded-bl-sm bg-surface-2 text-text',
      )}
    >
      {message.content}
    </div>
  );
}

function UsernameSection({ current }: { current: string | null }) {
  const { showToast } = useToast();
  const [value, setValue] = useState(current ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalized = value.trim().toLowerCase();
  const changed = normalized !== (current ?? '').toLowerCase();
  const valid = USERNAME_RE.test(normalized);

  async function save() {
    if (!valid) {
      setError('Use 3–20 lowercase letters, numbers, or underscores.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await db.profiles.changeUsername(normalized);
      showToast('Username updated — old links still work.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change username.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <AtSign size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-text">Username</h2>
          <p className="mt-1 text-sm text-text-muted">Your shareable SideQuest handle.</p>
        </div>
      </div>
      <div className="mt-4">
        <Label htmlFor="settings-username" hint="Old links keep working">
          Handle
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-text-muted">@</span>
          <Input
            id="settings-username"
            autoComplete="username"
            value={value}
            onChange={(event) => {
              setValue(event.target.value.toLowerCase());
              setError(null);
            }}
            error={error ?? undefined}
          />
          <Button type="button" variant="secondary" onClick={save} isLoading={saving} disabled={!changed || !valid}>
            Change
          </Button>
        </div>
        <FieldError message={error ?? undefined} />
        <p className="mt-2 text-xs leading-5 text-text-muted">
          Server-enforced limit: once every 7 days. Previous handles remain reserved to you.
        </p>
      </div>
    </section>
  );
}
