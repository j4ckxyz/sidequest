import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin, Pencil } from 'lucide-react';
import type { Profile } from '../../types/models';
import { Avatar } from '../ui/Avatar';
import { StarRating } from '../ui/StarRating';

export function ProfileHeader({ profile, isOwn }: { profile: Profile; isOwn: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
      <Avatar name={profile.full_name} src={profile.avatar_url} size="xl" />
      <div className="flex-1">
        <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:items-center">
          <h1 className="text-2xl text-text">{profile.full_name}</h1>
          {profile.is_verified && (
            <span className="flex items-center gap-1 text-xs font-medium text-sage">
              <BadgeCheck size={15} /> Verified
            </span>
          )}
        </div>
        <p className="mt-1 flex items-center justify-center gap-1 text-sm text-text-muted sm:justify-start">
          <MapPin size={14} /> {profile.parish}
        </p>
        {profile.rating_count > 0 && (
          <div className="mt-2 flex items-center justify-center gap-1.5 sm:justify-start">
            <StarRating value={profile.rating_avg} />
            <span className="text-sm text-text-muted">
              {profile.rating_avg.toFixed(1)} ({profile.rating_count} review{profile.rating_count === 1 ? '' : 's'})
            </span>
          </div>
        )}
        {profile.bio && <p className="mt-3 max-w-lg text-sm text-text-muted">{profile.bio}</p>}
        {profile.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
            {profile.skills.map((s) => (
              <span key={s} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-text-muted">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
      {isOwn && (
        <Link
          to="/profile/edit"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-sm font-medium text-text hover:bg-surface-2"
        >
          <Pencil size={14} /> Edit profile
        </Link>
      )}
    </div>
  );
}
