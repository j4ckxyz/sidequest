import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { MobileTopBar } from './MobileTopBar';
import { BannedScreen, userBlock } from './BannedScreen';

const CHROMELESS_ROUTES = ['/login', '/signup', '/onboarding', '/auth/callback'];

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const isChromeless = CHROMELESS_ROUTES.includes(location.pathname);

  // Blocked users see only the restriction notice (with a way to sign out).
  if (user && userBlock(user).blocked) {
    return <BannedScreen />;
  }

  // New (incl. Google) users finish setup before anything else.
  if (user && !user.onboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

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
