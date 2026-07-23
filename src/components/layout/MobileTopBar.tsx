import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Compass, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../context/AuthProvider';
import { useUnreadNotificationCount } from '../../hooks/useNotifications';
import { haptic } from '../../lib/haptics';

/**
 * Mobile's top bar — logo + theme toggle, plus (when signed in) an account menu
 * so Settings and Sign out are reachable on mobile, where the desktop Navbar
 * (and its account dropdown) is hidden.
 */
export function MobileTopBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const unreadNotifications = useUnreadNotificationCount(user?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <header className="glass sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border px-4 sm:hidden">
      <Link to="/" className="flex items-center gap-1.5 font-display text-lg text-text">
        <Compass size={19} className="text-primary" strokeWidth={2.25} />
        SideQuest
      </Link>
      <div className="flex items-center gap-1">
        {user && (
          <Link
            to="/notifications"
            onClick={() => haptic('tap')}
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
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                haptic('select');
                setMenuOpen((v) => !v);
              }}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
              className="ml-0.5 flex h-9 w-9 items-center justify-center rounded-full"
            >
              <Avatar name={user.full_name} src={user.avatar_url} size="sm" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="animate-menu-in absolute right-0 top-11 w-52 overflow-hidden rounded-xl border border-border bg-surface py-1.5 text-center shadow-lg"
              >
                <div className="border-b border-border px-3.5 pb-2 pt-1">
                  <p className="truncate text-sm font-medium text-text">{user.full_name}</p>
                  {user.username && <p className="truncate text-xs text-text-muted">@{user.username}</p>}
                </div>
                <MenuLink to={`/profile/${user.id}`} icon={<Compass size={15} />} label="My profile" onClose={() => setMenuOpen(false)} />
                <MenuLink to="/dashboard" icon={<LayoutDashboard size={15} />} label="My jobs" onClose={() => setMenuOpen(false)} />
                <MenuLink to="/settings" icon={<Settings size={15} />} label="Settings" onClose={() => setMenuOpen(false)} />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    haptic('tap');
                    setMenuOpen(false);
                    signOut().then(() => navigate('/'));
                  }}
                  className="flex w-full items-center justify-center gap-2 px-3.5 py-2 text-sm text-danger hover:bg-surface-2"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function MenuLink({ to, icon, label, onClose }: { to: string; icon: React.ReactNode; label: string; onClose: () => void }) {
  return (
    <Link
      to={to}
      onClick={() => {
        haptic('tap');
        onClose();
      }}
      className="flex items-center justify-center gap-2 px-3.5 py-2 text-sm text-text hover:bg-surface-2"
    >
      {icon} {label}
    </Link>
  );
}
