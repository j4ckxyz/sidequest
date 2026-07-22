import { Link } from 'react-router-dom';
import { Bell, Compass } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../../context/AuthProvider';
import { useUnreadNotificationCount } from '../../hooks/useNotifications';

/**
 * Mobile's equivalent of Navbar's logo + theme toggle — BottomNav covers navigation,
 * but without this, mobile had no way to switch theme at all (Navbar is sm:hidden).
 */
export function MobileTopBar() {
  const { user } = useAuth();
  const unreadNotifications = useUnreadNotificationCount(user?.id);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-canvas/85 px-4 backdrop-blur-md sm:hidden">
      <Link to="/" className="flex items-center gap-1.5 font-display text-lg text-text">
        <Compass size={19} className="text-primary" strokeWidth={2.25} />
        SideQuest
      </Link>
      <div className="flex items-center gap-1">
        {user && (
          <Link
            to="/notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
            aria-label={unreadNotifications > 0 ? `Notifications (${unreadNotifications} unread)` : 'Notifications'}
          >
            <Bell size={19} />
            {unreadNotifications > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-on-primary">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </Link>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
