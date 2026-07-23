import { useEffect, useState } from 'react';
import { AtSign, Check, Compass, LockKeyhole, MapPinOff } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useToast } from '../context/ToastProvider';
import { useJobPreferences, useUpdateJobPreferences } from '../hooks/useJobPreferences';
import { JOB_CATEGORIES } from '../lib/constants';
import { db } from '../lib/db';
import { cx } from '../lib/utils';
import { CategoryIcon } from '../components/jobs/CategoryIcon';
import { PreferenceAgent } from '../components/settings/PreferenceAgent';
import { Button } from '../components/ui/Button';
import { FieldError, Input, Label } from '../components/ui/Input';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function Settings() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const userId = user?.id ?? '';
  const preferenceQuery = useJobPreferences(user?.id);
  const updatePreferences = useUpdateJobPreferences(userId);
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

      <div className="mt-8 flex flex-col gap-6">
        <div className="grid items-start gap-6 md:grid-cols-2">
          <UsernameSection key={user.username} current={user.username} />

          <section className="glass-card rounded-xl border border-border p-5">
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

          <section className="glass-card rounded-xl border border-border p-5 md:col-span-2">
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
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
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

        <PreferenceAgent userId={userId} />
      </div>
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
    <section className="glass-card rounded-xl border border-border p-5">
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
