import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { PARISHES, SKILL_OPTIONS, type Parish } from '../lib/constants';
import { useAuth } from '../context/AuthProvider';
import { useUpdateProfile } from '../hooks/useProfile';
import { Input, Label, FieldError } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { PreferenceAgent } from '../components/settings/PreferenceAgent';
import { db } from '../lib/db';
import { cx } from '../lib/utils';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function suggestUsername(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
}

export function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { mutate, isPending } = useUpdateProfile();

  const [displayName, setDisplayName] = useState(user?.full_name ?? '');
  const [username, setUsername] = useState(user?.username ?? suggestUsername(user?.full_name ?? ''));
  // Email sign-ups arrive with no name, so keep suggesting a handle from what they type
  // until they edit the username themselves.
  const [usernameTouched, setUsernameTouched] = useState(Boolean(user?.username));
  const [parish, setParish] = useState<Parish>(user?.parish ?? 'St Helier');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [skills, setSkills] = useState<string[]>(user?.skills ?? []);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  if (!user) return null;

  function toggleSkill(skill: string) {
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const handle = username.trim().toLowerCase();
    if (!USERNAME_RE.test(handle)) {
      setUsernameError('3–20 characters: lowercase letters, numbers, or underscores.');
      return;
    }
    setChecking(true);
    const available = await db.profiles.usernameAvailable(handle, user.id);
    setChecking(false);
    if (!available) {
      setUsernameError('That username is taken — try another.');
      return;
    }
    setUsernameError(null);
    mutate(
      {
        id: user.id,
        patch: { full_name: displayName.trim() || 'Islander', username: handle, parish: parish as (typeof PARISHES)[number], bio, skills, onboarded: true },
      },
      // Straight into the optional AI chat step rather than the app, so people
      // arrive with a matching brief already set.
      { onSuccess: () => setStep(2) },
    );
  }

  return (
    <div className={cx('mx-auto flex flex-col px-6 py-14', step === 2 ? 'max-w-3xl' : 'max-w-md')}>
      <div className="mb-8 flex items-center justify-center gap-2 font-display text-xl text-text">
        <Compass size={22} className="text-primary" strokeWidth={2.25} />
        SideQuest
      </div>

      {step === 1 ? (
        <>
          <div className="flex flex-col items-center">
            <Avatar name={user.full_name || 'You'} src={user.avatar_url} size="lg" />
            <h1 className="mt-4 text-center text-2xl text-text">Welcome — let’s set you up</h1>
            <p className="mt-1.5 text-center text-sm text-text-muted">Thirty seconds. This is what neighbours will see.</p>
          </div>

          <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
        <div>
          <Label htmlFor="displayName" hint="First name or nickname is fine">
            Display name
          </Label>
          <Input
            id="displayName"
            required
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (!usernameTouched) setUsername(suggestUsername(e.target.value));
            }}
            placeholder="e.g. Jack, or Jack G"
          />
        </div>
        <div>
          <Label htmlFor="username" hint="Your shareable @handle">
            Username
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-text-muted">@</span>
            <Input
              id="username"
              required
              value={username}
              onChange={(e) => {
                setUsername(e.target.value.toLowerCase());
                setUsernameTouched(true);
                setUsernameError(null);
              }}
              placeholder="jack"
              error={usernameError ?? undefined}
            />
          </div>
          <FieldError message={usernameError ?? undefined} />
        </div>
        <div>
          <Label htmlFor="parish">Which parish are you in?</Label>
          <Select id="parish" value={parish} onChange={(e) => setParish(e.target.value as Parish)}>
            {PARISHES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label hint="Pick a few">What are you into?</Label>
          <p className="mb-2 text-xs text-text-muted">We’ll use these to suggest jobs you might fancy.</p>
          <div className="flex flex-wrap gap-2">
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
        </div>
        <div>
          <Label htmlFor="bio" hint="Optional">
            A line about yourself
          </Label>
          <Textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="e.g. Keen gardener, free most weekends." />
        </div>
          <Button type="submit" size="lg" isLoading={isPending || checking} className="mt-2">
            Continue
          </Button>
          </form>
        </>
      ) : (
        <div className="flex flex-col items-center">
          <h1 className="text-center text-2xl text-text">Tell us what you’re after</h1>
          <p className="mt-1.5 max-w-md text-center text-sm leading-6 text-text-muted">
            Optional — a quick private chat helps us match you to the right jobs. You can always do this later in Settings.
          </p>
          <div className="mt-6 w-full">
            <PreferenceAgent userId={user.id} />
          </div>
          <Button size="lg" className="mt-6 w-full max-w-sm" onClick={() => navigate('/', { replace: true })}>
            Take me to SideQuest
          </Button>
        </div>
      )}
    </div>
  );
}
