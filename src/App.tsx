import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, AlertTriangle } from 'lucide-react'
import Nav, { type View, type NavMode } from './components/Nav'
import Landing from './components/Landing'
import AuthScreen from './components/AuthScreen'
import QuestBoard from './pages/QuestBoard'
import DoerDashboard from './pages/DoerDashboard'
import PostQuest from './pages/PostQuest'
import PosterManage from './pages/PosterManage'
import { ToastProvider } from './components/Toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { getMyDoer, getMyPoster, myApplications } from './lib/db'
import { LogoMark, Wordmark } from './components/Logo'
import type { Role } from './lib/types'

function Footer() {
  return (
    <footer className="mt-8 border-t border-granite-200 bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-7 w-7" />
          <Wordmark className="text-[14px]" />
        </div>
        <p className="text-[13px] text-ink-faint">
          Turn chores into quests · Made on the Rock
        </p>
      </div>
    </footer>
  )
}

function Splash({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface text-ink-muted">
      {children}
    </div>
  )
}

function Shell() {
  const { session, profile, loading, signOut } = useAuth()

  const [view, setView] = useState<View>('home')
  const [authOpen, setAuthOpen] = useState(false)
  const [authRole, setAuthRole] = useState<Role>('doer')

  const [displayName, setDisplayName] = useState('')
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())

  const role = profile?.role

  useEffect(() => {
    let alive = true
    if (!session || !profile) {
      setDisplayName('')
      return
    }
    ;(async () => {
      try {
        if (profile.role === 'doer') {
          const [me, apps] = await Promise.all([
            getMyDoer(session.user.id),
            myApplications(session.user.id),
          ])
          if (!alive) return
          setDisplayName(me?.name ?? '')
          setAppliedIds(new Set(apps.map((a) => a.quest_id)))
        } else {
          const p = await getMyPoster(session.user.id)
          if (!alive) return
          setDisplayName(p?.name ?? '')
        }
      } catch {
        /* handled in pages */
      }
    })()
    return () => {
      alive = false
    }
  }, [session, profile])

  useEffect(() => {
    if (!session) {
      setView('home')
      setAuthOpen(false)
    } else if (role === 'poster') {
      setView((v) => (v === 'home' ? 'manage' : v))
    } else if (role === 'doer') {
      setView((v) => (v === 'home' ? 'board' : v))
    }
  }, [session, role])

  const openAuth = useCallback((r: Role) => {
    setAuthRole(r)
    setAuthOpen(true)
  }, [])

  if (loading) {
    return (
      <Splash>
        <Loader2 className="h-6 w-6 animate-spin text-jersey-500" />
        <p className="text-[14px]">Loading SideQuest…</p>
      </Splash>
    )
  }

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
            reload. If you just signed up, confirm your email and log in.
          </p>
          <button onClick={signOut} className="btn-ghost mt-5 px-5 py-2.5 text-[14px]">
            Sign out
          </button>
        </div>
      </Splash>
    )
  }

  if (!session) {
    if (authOpen) {
      return <AuthScreen initialRole={authRole} onBack={() => setAuthOpen(false)} />
    }
    return (
      <div className="min-h-screen bg-surface">
        <Nav
          mode="guest"
          view={view}
          setView={setView}
          onSignIn={() => openAuth('doer')}
          onSignOut={signOut}
        />
        <main>
          <Landing onStart={openAuth} />
        </main>
      </div>
    )
  }

  const mode: NavMode = role === 'poster' ? 'poster' : 'doer'
  const me = { id: session.user.id, name: displayName, role: mode }

  return (
    <div className="min-h-screen bg-surface">
      <Nav
        mode={mode}
        view={view}
        setView={setView}
        userName={displayName}
        userId={session.user.id}
        onSignIn={() => openAuth('doer')}
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
            {view === 'board' && (
              <QuestBoard
                me={me}
                appliedIds={appliedIds}
                onApplied={(id) => setAppliedIds((prev) => new Set(prev).add(id))}
              />
            )}
            {mode === 'doer' && view === 'me' && (
              <DoerDashboard meId={session.user.id} meName={displayName} />
            )}
            {mode === 'poster' && view === 'post' && (
              <PostQuest meId={session.user.id} onPosted={() => setView('manage')} />
            )}
            {mode === 'poster' && view === 'manage' && (
              <PosterManage meId={session.user.id} meName={displayName} />
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
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
