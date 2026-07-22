import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useUpdateProfile } from '../hooks/useProfile';
import { useToast } from '../context/ToastProvider';
import { PARISHES, SKILL_OPTIONS, type Parish } from '../lib/constants';
import { Input, Label, FieldError } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { db } from '../lib/db';
import { cx } from '../lib/utils';

export function ProfileEdit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { mutate, isPending } = useUpdateProfile();

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [parish, setParish] = useState<Parish>(user?.parish ?? 'St Helier');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [skills, setSkills] = useState<string[]>(user?.skills ?? []);
  const [avatar, setAvatar] = useState<string | null>(user?.avatar_url ?? null);

  if (!user) return null;

  function toggleSkill(skill: string) {
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));
  }

  function onAvatarSelected(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    mutate(
      { id: user.id, patch: { full_name: fullName, parish: parish as (typeof PARISHES)[number], bio, phone: phone || null, skills, avatar_url: avatar } },
      {
        onSuccess: () => {
          showToast('Profile updated.');
          navigate(`/profile/${user.id}`);
        },
      },
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl text-text">Edit profile</h1>

      <div className="mt-6">
        <UsernameSection current={user.username} />
      </div>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <div className="flex justify-center">
          <label className="group relative cursor-pointer">
            <Avatar name={fullName} src={avatar} size="xl" />
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-text-muted group-hover:text-primary">
              <Camera size={14} />
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onAvatarSelected(e.target.files)} />
          </label>
        </div>

        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="parish">Parish</Label>
          <Select id="parish" value={parish} onChange={(e) => setParish(e.target.value as Parish)}>
            {PARISHES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="phone" hint="Optional — shared only once you're hired">
            Phone
          </Label>
          <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07797 100 000" />
        </div>
        <div>
          <Label htmlFor="bio" hint="Optional">
            About you
          </Label>
          <Textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <div>
          <Label hint="Optional">What can you help with?</Label>
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
        <Button type="submit" size="lg" isLoading={isPending} className="mt-2">
          Save changes
        </Button>
      </form>
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
    <div className="rounded-lg border border-border bg-surface p-4">
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
      <p className="mt-1.5 text-xs text-text-muted">You can change this once a week. Your old @handle stays reserved and old links redirect here.</p>
    </div>
  );
}
