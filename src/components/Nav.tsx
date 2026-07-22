import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  GraduationCap,
  Search,
  CalendarHeart,
  PlusCircle,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { initialsOf, gradientFor } from '../lib/constants'
import Avatar from './Avatar'

export type View = 'home' | 'student' | 'employer' | 'post' | 'hub'
export type NavMode = 'guest' | 'student' | 'employer'

const studentTabs: { id: View; label: string; icon: typeof Search }[] = [
  { id: 'student', label: 'My Dashboard', icon: GraduationCap },
  { id: 'hub', label: 'Holiday Hub', icon: CalendarHeart },
]

const employerTabs: { id: View; label: string; icon: typeof Search }[] = [
  { id: 'employer', label: 'Find Talent', icon: Search },
  { id: 'post', label: 'Post & Manage', icon: PlusCircle },
  { id: 'hub', label: 'Holiday Hub', icon: CalendarHeart },
]

export default function Nav({
  mode,
  view,
  setView,
  userName,
  userId,
  onSignIn,
  onSignOut,
}: {
  mode: NavMode
  view: View
  setView: (v: View) => void
  userName?: string
  userId?: string
  onSignIn: () => void
  onSignOut: () => void
}) {
  const tabs = mode === 'employer' ? employerTabs : mode === 'student' ? studentTabs : []
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 flex justify-center px-4 pt-4">
      <nav className="flex w-full max-w-6xl items-center justify-between gap-4 rounded-full border border-white/60 bg-white/70 py-2 pl-4 pr-2 shadow-glass backdrop-blur-xl">
        <button
          onClick={() => setView(mode === 'guest' ? 'home' : tabs[0].id)}
          className="group flex items-center gap-2.5"
          aria-label="JèrriConnect home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sea-400 to-sea-700 shadow-soft transition-transform group-hover:scale-105">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path d="M7 15c2 2 8 2 10 0" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="8.5" cy="9.5" r="1.5" fill="white" />
              <circle cx="15.5" cy="9.5" r="1.5" fill="white" />
            </svg>
          </span>
          <span className="text-[17px] font-semibold tracking-tight text-ink">
            Jèrri<span className="text-sea-600">Connect</span>
          </span>
        </button>

        {tabs.length > 0 && (
          <div className="hidden items-center gap-1 rounded-full bg-granite-100/80 p-1 sm:flex">
            {tabs.map((t) => {
              const active = view === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setView(t.id)}
                  className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium transition-colors ${
                    active ? 'text-ink' : 'text-ink-muted hover:text-ink-soft'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-white shadow-soft"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <t.icon className="relative z-10 h-4 w-4" />
                  <span className="relative z-10">{t.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {mode === 'guest' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onSignIn}
              className="hidden rounded-full px-4 py-2 text-[14px] font-medium text-ink-soft transition hover:text-ink sm:block"
            >
              Sign in
            </button>
            <button onClick={onSignIn} className="btn-primary text-[14px]">
              Get started
            </button>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition hover:bg-granite-100"
            >
              <Avatar
                initials={initialsOf(userName ?? '?')}
                gradient={gradientFor(userId ?? userName ?? 'x')}
                size="sm"
              />
              <ChevronDown className="h-4 w-4 text-ink-faint" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-granite-200 bg-white p-1.5 shadow-float"
                >
                  <div className="px-3 py-2">
                    <p className="truncate text-[14px] font-semibold text-ink">{userName}</p>
                    <p className="text-[12px] capitalize text-ink-faint">{mode} account</p>
                  </div>
                  <div className="my-1 h-px bg-granite-100" />
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onSignOut()
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[14px] font-medium text-ink-soft transition hover:bg-granite-100"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </motion.div>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  )
}
