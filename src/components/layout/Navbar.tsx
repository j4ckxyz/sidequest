import { Link, useNavigate } from 'react-router-dom';
import { Compass, MessageCircle, Plus, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthProvider';
import { useUnreadCount } from '../../hooks/useMessages';
import { ThemeToggle } from './ThemeToggle';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { cx } from '../../lib/utils';

export function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const unread = useUnreadCount(user?.id);

  return (
    <header className="sticky top-0 z-40 hidden border-b border-border bg-canvas/90 backdrop-blur sm:block">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-xl text-text">
          <Compass size={22} className="text-primary" strokeWidth={2.25} />
          SideQuest
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium text-text-muted">
          <Link to="/jobs" className="hover:text-text">
            Browse
          </Link>
          {user && (
            <Link to="/dashboard" className="hover:text-text">
              Dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
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
              <details className="relative ml-1">
                <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
                  <Avatar name={user.full_name} src={user.avatar_url} size="sm" />
                </summary>
                <div className="absolute right-0 top-11 w-48 rounded-xl border border-border bg-surface py-1.5 shadow-lg">
                  <Link to={`/profile/${user.id}`} className="block px-3.5 py-2 text-sm text-text hover:bg-surface-2">
                    My profile
                  </Link>
                  <Link to="/dashboard" className="block px-3.5 py-2 text-sm text-text hover:bg-surface-2">
                    Dashboard
                  </Link>
                  {user.is_admin && (
                    <Link to="/admin" className="flex items-center gap-1.5 px-3.5 py-2 text-sm text-sea hover:bg-surface-2">
                      <ShieldCheck size={14} /> Admin
                    </Link>
                  )}
                  <button
                    onClick={() => signOut().then(() => navigate('/'))}
                    className={cx('block w-full px-3.5 py-2 text-left text-sm text-text hover:bg-surface-2')}
                  >
                    Sign out
                  </button>
                </div>
              </details>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Log in
              </Button>
              <Button size="sm" onClick={() => navigate('/signup')}>
                Sign up
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
