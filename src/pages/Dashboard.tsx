import { Link, NavLink, Outlet } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { cx } from '../lib/utils';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.full_name?.trim().split(/\s+/)[0] ?? 'there';

  return (
    <div className="mx-auto max-w-5xl px-6 pt-10 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-text-muted">Here's what's happening across your quests.</p>
        </div>
        <Link
          to="/jobs/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-primary shadow-sm transition-colors hover:bg-primary-hover"
        >
          <Plus size={16} /> Post a job
        </Link>
      </div>

      <div className="mt-7 flex gap-1 border-b border-border">
        <Tab to="/dashboard" label="Overview" end />
        <Tab to="/dashboard/posted" label="Posted jobs" />
        <Tab to="/dashboard/applications" label="Applications" />
      </div>

      <div className="mt-7">
        <Outlet />
      </div>
    </div>
  );
}

function Tab({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cx('-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors', isActive ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text')
      }
    >
      {label}
    </NavLink>
  );
}
