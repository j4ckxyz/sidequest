import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, AlertTriangle } from 'lucide-react'
import Nav, { type View, type NavMode } from './components/Nav'
import Landing from './components/Landing'
import AuthScreen from './components/AuthScreen'
import StudentDashboard from './pages/StudentDashboard'
import EmployerPortal from './pages/EmployerPortal'
import EmployerPost from './pages/EmployerPost'
import HolidayHub from './pages/HolidayHub'
import { ToastProvider, useToast } from './components/Toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { getMyEmployer, getMyStudent, myApplications, apply } from './lib/db'
import type { Role } from './lib/types'

function Footer() {
  return (
    <footer className="mt-8 border-t border-granite-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sea-400 to-sea-700">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path d="M7 15c2 2 8 2 10 0" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="8.5" cy="9.5" r="1.5" fill="white" />
              <circle cx="15.5" cy="9.5" r="1.5" fill="white" />
            </svg>
          </span>
          <span className="text-[14px] font-semibold text-ink">
            Jèrri<span className="text-sea-600">Connect</span>
          </span>
        </div>
        <p className="text-[13px] text-ink-faint">
          Bringing Jersey’s talent home · Built on the Rock
        </p>
      </div>
    </footer>
  )
}

function Splash({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white text-ink-muted">
      {children}
    </div>
  )
}

function Shell() {
  const { session, profile, loading, signOut } = useAuth()
  const { notify } = useToast()

  const [view, setView] = useState<View>('home')
  const [authOpen, setAuthOpen] = useState(false)
  const [authRole, setAuthRole] = useState<Role>('student')

  const [displayName, setDisplayName] = useState('')
  const [company, setCompany] = useState('')
  const [appliedOpps, setAppliedOpps] = useState<Set<string>>(new Set())

  const role = profile?.role

  // Load the display name / company + applications once we know the role.
  useEffect(() => {
    let alive = true
    if (!session || !profile) {
      setDisplayName('')
      setCompany('')
      return
    }
    ;(async () => {
      try {
        if (profile.role === 'student') {
          const [me, apps] = await Promise.all([
            getMyStudent(session.user.id),
            myApplications(session.user.id),
          ])
          if (!alive) return
          setDisplayName(me?.name ?? '')
          setAppliedOpps(
            new Set(apps.filter((a) => a.opportunity_id).map((a) => a.opportunity_id!)),
          )
        } else {
          const emp = await getMyEmployer(session.user.id)
          if (!alive) return
          setDisplayName(emp?.contact_name || emp?.company || '')
          setCompany(emp?.company ?? '')
        }
      } catch {
        /* handled elsewhere */
      }
    })()
    return () => {
      alive = false
    }
  }, [session, profile])

  // Land on the right default view when auth state resolves.
  useEffect(() => {
    if (!session) {
      setView('home')
      setAuthOpen(false)
    } else if (role === 'employer') {
      setView((v) => (v === 'home' ? 'employer' : v))
    } else if (role === 'student') {
      setView((v) => (v === 'home' ? 'student' : v))
    }
  }, [session, role])

  const openAuth = useCallback((r: Role) => {
    setAuthRole(r)
    setAuthOpen(true)
  }, [])

  const onApplyOpportunity = useCallback(
    async (id: string, label: string) => {
      if (!session) return
      setAppliedOpps((prev) => new Set(prev).add(id))
      try {
        await apply(session.user.id, { opportunity_id: id })
        notify(`Applied to ${label}`, 'The employer can see your application.')
      } catch (e) {
        notify('Could not apply', (e as Error).message)
      }
    },
    [session, notify],
  )

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Splash>
        <Loader2 className="h-6 w-6 animate-spin text-sea-500" />
        <p className="text-[14px]">Loading JèrriConnect…</p>
      </Splash>
    )
  }

  // Logged in but no profile row → almost always the migration hasn't been run.
  if (session && !profile) {
    return (
      <Splash>
        <div className="mx-auto max-w-md px-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-500" />
          <p className="text-[17px] font-semibold text-ink">Almost there</p>
          <p className="mt-1.5 text-[14px] text-ink-muted">
            Your account exists but its profile couldn’t be loaded. If this is a new
            Supabase project, run the migration in{' '}
            <code className="rounded bg-granite-100 px-1">supabase/migrations</code>, then
            reload. If you just signed up, please confirm your email and sign in.
          </p>
          <button onClick={signOut} className="btn-ghost mt-5 px-5 py-2.5 text-[14px]">
            Sign out
          </button>
        </div>
      </Splash>
    )
  }

  // Logged out → auth screen or marketing landing.
  if (!session) {
    if (authOpen) {
      return <AuthScreen initialRole={authRole} onBack={() => setAuthOpen(false)} />
    }
    return (
      <div className="min-h-screen bg-white">
        <Nav
          mode="guest"
          view={view}
          setView={setView}
          onSignIn={() => openAuth('student')}
          onSignOut={signOut}
        />
        <main>
          <Landing onStart={openAuth} />
        </main>
      </div>
    )
  }

  // Logged in.
  const mode: NavMode = role === 'employer' ? 'employer' : 'student'

  return (
    <div className="min-h-screen bg-white">
      <Nav
        mode={mode}
        view={view}
        setView={setView}
        userName={displayName}
        userId={session.user.id}
        onSignIn={() => openAuth('student')}
        onSignOut={signOut}
      />
      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {mode === 'student' && view === 'student' && (
              <StudentDashboard goHub={() => setView('hub')} />
            )}
            {mode === 'employer' && view === 'employer' && (
              <EmployerPortal company={company} />
            )}
            {mode === 'employer' && view === 'post' && <EmployerPost company={company} />}
            {view === 'hub' && (
              <HolidayHub
                canApply={mode === 'student'}
                appliedOpps={appliedOpps}
                onApply={onApplyOpportunity}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </AuthProvider>
  )
}
