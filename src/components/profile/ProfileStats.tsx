import type { Profile } from '../../types/models';
import { formatDate } from '../../lib/utils';

export function ProfileStats({ profile }: { profile: Profile }) {
  const stats = [
    { label: 'Jobs posted', value: profile.jobs_posted_count },
    { label: 'Jobs completed', value: profile.jobs_completed_count },
    { label: 'On SideQuest since', value: formatDate(profile.created_at, { month: 'short', year: 'numeric' }) },
  ];

  return (
    <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-surface">
      {stats.map((s) => (
        <div key={s.label} className="px-4 py-4 text-center">
          <p className="text-xl text-text">{s.value}</p>
          <p className="mt-0.5 text-xs text-text-muted">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
