import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { db } from '../lib/db';
import type { Parish } from '../lib/constants';
import type { Profile } from '../types/models';

interface AuthContextValue {
  user: Profile | null;
  isLoading: boolean;
  signUp: (input: { email: string; password: string; fullName: string; parish: Parish }) => Promise<Profile>;
  signIn: (input: { email: string; password: string }) => Promise<Profile>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    db.auth.getSession().then((profile) => {
      if (active) {
        setUser(profile);
        setIsLoading(false);
      }
    });
    const unsubscribe = db.subscribe(() => {
      db.auth.getSession().then((profile) => active && setUser(profile));
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    signUp: (input) => db.auth.signUp(input),
    signIn: (input) => db.auth.signIn(input),
    signOut: () => db.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
