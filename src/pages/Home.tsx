import { useAuth } from '../context/AuthProvider';
import { LandingPage } from './LandingPage';
import { SignedInHome } from './SignedInHome';

export function Home() {
  const { user, isLoading } = useAuth();

  // Avoid flashing the marketing landing to a returning user while the session resolves.
  if (isLoading) return null;

  return user ? <SignedInHome /> : <LandingPage />;
}
