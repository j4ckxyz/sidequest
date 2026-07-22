import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { MobileTopBar } from './MobileTopBar';

const CHROMELESS_ROUTES = ['/login', '/signup', '/onboarding'];

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isChromeless = CHROMELESS_ROUTES.includes(location.pathname);

  if (isChromeless) {
    return <div className="min-h-screen bg-canvas">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <MobileTopBar />
      <main className="pb-24 sm:pb-12">{children}</main>
      <BottomNav />
    </div>
  );
}
