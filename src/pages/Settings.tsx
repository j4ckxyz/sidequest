import { useState, type KeyboardEvent } from 'react';
import { X, MapPinOff } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useUpdateProfile } from '../hooks/useProfile';
import { useToast } from '../context/ToastProvider';
import { SKILL_OPTIONS } from '../lib/constants';
import { Input, Label, FieldError } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { db } from '../lib/db';
import { cx } from '../lib/utils';

export function Settings() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { mutate, isPending } = useUpdateProfile();

  const [skills, setSkills] = useState<string[]>(user?.skills ?? []);
  const [keywords, setKeywords] = useState<string[]>(user?.interest_keywords ?? []);
  const [keywordDraft, setKeywordDraft] = useState('');
  const [hideLocation, setHideLocation] = useState(user?.hide_location ?? false);

  if (!user) return null;
  const userId = user.id;

  function toggleSkill(skill: string) {
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));
  }

  function addKeyword(raw: string) {
    const k = raw.trim().toLowerCase();
    if (k && !keywords.includes(k) && keywords.length < 15) setKeywords((prev) => [...prev, k]);
    setKeywordDraft('');
  }

  function onKeywordKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword(keywordDraft);
    }
  }

  function savePreferences() {
    mutate(
      { id: userId, patch: { skills, interest_keywords: keywords, hide_location: hideLocation } },
      {
        onSuccess: () => showToast('Preferences saved.'),
        onError: (error) => showToast(error instanceof Error ? error.message : 'Could not save preferences.', 'error'),
      },
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <h1 className="text-2xl text-text">Settings</h1>
      <p className="mt-1 text-sm text-text-muted">Your handle, what you’re into, and how you show up.</p>

      <div className="mt-6 flex flex-col gap-6">
        <UsernameSection current={user.username} />

        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="text-base font-semibold text-text">What are you into?</h2>
          <p className="mt-1 text-xs text-text-muted">Used to suggest jobs you’d fancy.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SKILL_OPTIONS.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={cx(
                  'rounded-full border px-3 py-1.5 text-sm transition-colors',
                  skills.includes(skill) ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-text-muted hover:border-primary/40',
                )}
              >
                {skill}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="text-base font-semibold text-text">Interest keywords</h2>
          <p className="mt-1 text-xs text-text-muted">Anything specific — “dog walking”, “flat-pack”, “gardening near St Aubin”. These help the AI find better matches.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {keywords.map((k) => (
              <span key={k} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-sm text-text">
                {k}
                <button type="button" onClick={() => setKeywords((prev) => prev.filter((x) => x !== k))} aria-label={`Remove ${k}`}>
                  <X size={13} className="text-text-muted hover:text-text" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={keywordDraft}
              onChange={(e) => setKeywordDraft(e.target.value)}
              onKeyDown={onKeywordKey}
              placeholder="Type an interest and press Enter"
              aria-label="Add an interest keyword"
            />
            <Button type="button" variant="secondary" onClick={() => addKeyword(keywordDraft)} disabled={!keywordDraft.trim()}>
              Add
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={hideLocation}
              onChange={(e) => setHideLocation(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
            />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-text">
                <MapPinOff size={15} /> Hide my parish from other people
              </span>
              <span className="mt-0.5 block text-xs text-text-muted">Your parish stays private on your profile, but is still used to suggest jobs near you.</span>
            </span>
          </label>
        </section>

        <Button size="lg" isLoading={isPending} onClick={savePreferences} className="self-start">
          Save preferences
        </Button>
      </div>
    </div>
  );
}

function UsernameSection({ current }: { current: string | null }) {
  const { showToast } = useToast();
  const [value, setValue] = useState(current ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = value.trim().toLowerCase() !== (current ?? '').toLowerCase();

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await db.profiles.changeUsername(value.trim().toLowerCase());
      showToast('Username updated — old links still work.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change username.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <Label htmlFor="username" hint="Old links keep working">
        Username
      </Label>
      <div className="flex items-center gap-2">
        <span className="text-text-muted">@</span>
        <Input
          id="username"
          value={value}
          onChange={(e) => {
            setValue(e.target.value.toLowerCase());
            setError(null);
          }}
          error={error ?? undefined}
        />
        <Button type="button" variant="secondary" onClick={save} isLoading={saving} disabled={!changed}>
          Change
        </Button>
      </div>
      <FieldError message={error ?? undefined} />
      <p className="mt-1.5 text-xs text-text-muted">Changeable once a week. Old @handle stays reserved and old links redirect here.</p>
    </section>
  );
}
