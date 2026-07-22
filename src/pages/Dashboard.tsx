import { NavLink, Outlet } from 'react-router-dom';
import { cx } from '../lib/utils';

export function Dashboard() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-display text-2xl text-text">Dashboard</h1>
      <div className="mt-5 flex gap-1 border-b border-border">
        <Tab to="/dashboard/posted" label="My posted jobs" />
        <Tab to="/dashboard/applications" label="My applications" />
      </div>
      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}

function Tab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cx('-mb-px border-b-2 px-4 py-2.5 text-sm font-medium', isActive ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text')
      }
    >
      {label}
    </NavLink>
  );
}
