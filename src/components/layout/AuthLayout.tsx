import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import type { ReactNode } from 'react';

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm flex-col justify-center px-6 py-16">
      <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-display text-xl text-text">
        <Compass size={22} className="text-primary" strokeWidth={2.25} />
        SideQuest
      </Link>
      <h1 className="text-center font-display text-2xl text-text">{title}</h1>
      <p className="mt-1.5 text-center text-sm text-text-muted">{subtitle}</p>
      <div className="mt-7">{children}</div>
      {footer && <div className="mt-6 text-center text-sm text-text-muted">{footer}</div>}
    </div>
  );
}
