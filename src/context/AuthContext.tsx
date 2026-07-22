import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getProfile } from '../lib/db'
import type { Profile, Role } from '../lib/types'

interface SignUpMeta {
  role: Role
  name: string
  company?: string
  field?: string
  graduation_year?: string
}

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  needsConfirmation: boolean
  signUp: (
    email: string,
    password: string,
    meta: SignUpMeta,
  ) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null)
      return
    }
    try {
      // The new-user trigger creates the row; on a brand new signup it may lag a
      // beat, so retry once.
      let p = await getProfile(userId)
      if (!p) {
        await new Promise((r) => setTimeout(r, 600))
        p = await getProfile(userId)
      }
      setProfile(p)
    } catch (e) {
      console.error('Failed to load profile', e)
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session?.user.id)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s)
      await loadProfile(s?.user.id)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const signUp: AuthContextValue['signUp'] = useCallback(
    async (email, password, meta) => {
      setNeedsConfirmation(false)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { ...meta } },
      })
      if (error) return { error: error.message }
      // Email confirmation on → user exists but no session yet.
      if (!data.session) {
        setNeedsConfirmation(true)
        return { error: null }
      }
      await loadProfile(data.session.user.id)
      return { error: null }
    },
    [loadProfile],
  )

  const signIn: AuthContextValue['signIn'] = useCallback(
    async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      return { error: null }
    },
    [],
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setNeedsConfirmation(false)
  }, [])

  const refreshProfile = useCallback(
    () => loadProfile(session?.user.id),
    [loadProfile, session],
  )

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        needsConfirmation,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
