import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Plus, MessageCircle, User } from 'lucide-react';
import { useAuth } from '../../context/AuthProvider';
import { useUnreadCount } from '../../hooks/useMessages';
import { cx } from '../../lib/utils';

export function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const unread = useUnreadCount(user?.id);

  const isActive = (path: string) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  const profilePath = user ? `/profile/${user.id}` : '/login';
  const messagesPath = user ? '/messages' : '/login';
  const postPath = user ? '/jobs/new' : '/login';

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-canvas/95 backdrop-blur sm:hidden" aria-label="Primary">
      <div className="mx-auto flex max-w-md items-center justify-between px-6 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <NavItem to="/" label="Home" active={isActive('/') && location.pathname === '/'} icon={<Home size={20} />} />
        <NavItem to="/jobs" label="Browse" active={isActive('/jobs') && !location.pathname.includes('/new')} icon={<Search size={20} />} />

        <Link
          to={postPath}
          aria-label="Post a job"
          className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg shadow-primary/30 transition-transform active:scale-95"
        >
          <Plus size={24} />
        </Link>

        <NavItem to={messagesPath} label="Messages" active={isActive('/messages')} icon={<MessageCircle size={20} />} badge={unread > 0} />
        <NavItem to={profilePath} label="Profile" active={isActive('/profile')} icon={<User size={20} />} />
      </div>
    </nav>
  );
}

function NavItem({ to, label, icon, active, badge }: { to: string; label: string; icon: React.ReactNode; active: boolean; badge?: boolean }) {
  return (
    <Link to={to} className={cx('relative flex flex-col items-center gap-0.5 px-2 py-1 text-xs font-medium', active ? 'text-primary' : 'text-text-muted')}>
      {icon}
      {badge && <span className="absolute right-1.5 top-0.5 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />}
      {label}
    </Link>
  );
}
