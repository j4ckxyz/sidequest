import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, Compass, MessageCircle, Plus, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthProvider';
import { useUnreadCount } from '../../hooks/useMessages';
import { useUnreadNotificationCount } from '../../hooks/useNotifications';
import { ThemeToggle } from './ThemeToggle';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { cx } from '../../lib/utils';

export function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const unread = useUnreadCount(user?.id);
  const unreadNotifications = useUnreadNotificationCount(user?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the account menu on outside click or Esc — like every other dropdown.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 hidden border-b border-border bg-canvas/85 backdrop-blur-md sm:block">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-xl text-text">
          <Compass size={22} className="text-primary" strokeWidth={2.25} />
          SideQuest
        </Link>

        <nav className="flex items-center gap-1 text-sm font-medium">
          <NavItem to="/jobs" label="Browse jobs" />
          {user && <NavItem to="/dashboard" label="My jobs" />}
          <NavItem to="/about" label="About" />
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <Link
                to="/notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
                aria-label={unreadNotifications > 0 ? `Notifications (${unreadNotifications} unread)` : 'Notifications'}
              >
                <Bell size={18} />
                {unreadNotifications > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-on-primary">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </Link>
              <Link
                to="/messages"
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
                aria-label="Messages"
              >
                <MessageCircle size={18} />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-primary" aria-hidden />
                )}
              </Link>
              <Button size="sm" onClick={() => navigate('/jobs/new')}>
                <Plus size={16} />
                Post a job
              </Button>
              <div className="relative ml-1" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Account menu"
                  className="flex rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Avatar name={user.full_name} src={user.avatar_url} size="sm" />
                </button>
                {menuOpen && (
                  <div role="menu" className="animate-menu-in absolute right-0 top-11 w-48 rounded-xl border border-border bg-surface py-1.5 shadow-lg">
                    <Link to={`/profile/${user.id}`} onClick={() => setMenuOpen(false)} className="block px-3.5 py-2 text-sm text-text hover:bg-surface-2">
                      My profile
                    </Link>
                    <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block px-3.5 py-2 text-sm text-text hover:bg-surface-2">
                      Dashboard
                    </Link>
                    <Link to="/settings" onClick={() => setMenuOpen(false)} className="block px-3.5 py-2 text-sm text-text hover:bg-surface-2">
                      Settings
                    </Link>
                    {user.is_admin && (
                      <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-1.5 px-3.5 py-2 text-sm text-sage hover:bg-surface-2">
                        <ShieldCheck size={14} /> Admin
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        signOut().then(() => navigate('/'));
                      }}
                      className={cx('block w-full px-3.5 py-2 text-left text-sm text-text hover:bg-surface-2')}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate('/login')}>
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cx(
          'rounded-md px-3 py-1.5 transition-colors',
          isActive ? 'bg-surface-2 text-text' : 'text-text-muted hover:bg-surface-2 hover:text-text',
        )
      }
    >
      {label}
    </NavLink>
  );
}
