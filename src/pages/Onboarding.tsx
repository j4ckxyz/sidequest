import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { PARISHES, SKILL_OPTIONS, type Parish } from '../lib/constants';
import { useAuth } from '../context/AuthProvider';
import { useUpdateProfile } from '../hooks/useProfile';
import { Input, Label } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { cx } from '../lib/utils';

export function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { mutate, isPending } = useUpdateProfile();

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [parish, setParish] = useState<Parish>(user?.parish ?? 'St Helier');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);

  if (!user) return null;

  function toggleSkill(skill: string) {
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    mutate(
      { id: user.id, patch: { full_name: fullName, parish: parish as (typeof PARISHES)[number], bio, skills } },
      { onSuccess: () => navigate('/', { replace: true }) },
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-14">
      <div className="mb-8 flex items-center justify-center gap-2 font-display text-xl text-text">
        <Compass size={22} className="text-primary" strokeWidth={2.25} />
        SideQuest
      </div>
      <h1 className="text-center text-2xl text-text">Tell us a bit about you</h1>
      <p className="mt-1.5 text-center text-sm text-text-muted">Takes thirty seconds — this is what neighbours will see.</p>

      <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
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
          <Label htmlFor="bio" hint="Optional">
            A line about yourself
          </Label>
          <Textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="e.g. Keen gardener, free most weekends." />
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
          Take me to SideQuest
        </Button>
      </form>
    </div>
  );
}
