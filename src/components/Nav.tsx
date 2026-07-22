import { useState } from 'react'
import { motion } from 'framer-motion'
import { Compass, PlusCircle, ClipboardList, Swords, LogOut, ChevronDown } from 'lucide-react'
import { initialsOf, gradientFor } from '../lib/constants'
import Avatar from './Avatar'
import { LogoMark, Wordmark } from './Logo'

export type View = 'home' | 'board' | 'me' | 'post' | 'manage'
export type NavMode = 'guest' | 'doer' | 'poster'

const doerTabs: { id: View; label: string; icon: typeof Compass }[] = [
  { id: 'board', label: 'Quest Board', icon: Compass },
  { id: 'me', label: 'My Adventures', icon: Swords },
]

const posterTabs: { id: View; label: string; icon: typeof Compass }[] = [
  { id: 'manage', label: 'My Quests', icon: ClipboardList },
  { id: 'post', label: 'Post a Quest', icon: PlusCircle },
  { id: 'board', label: 'Quest Board', icon: Compass },
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
  const tabs = mode === 'poster' ? posterTabs : mode === 'doer' ? doerTabs : []
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 flex justify-center px-4 pt-4">
      <nav className="flex w-full max-w-6xl items-center justify-between gap-4 rounded-full border border-white/60 bg-white/70 py-2 pl-4 pr-2 shadow-glass backdrop-blur-xl">
        <button
          onClick={() => setView(mode === 'guest' ? 'home' : tabs[0].id)}
          className="group flex items-center gap-2.5"
          aria-label="SideQuest home"
        >
          <LogoMark className="h-8 w-8 transition-transform group-hover:scale-105" />
          <Wordmark />
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
              Log in
            </button>
            <button onClick={onSignIn} className="btn-accent text-[14px]">
              Start questing
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
                    <p className="text-[12px] capitalize text-ink-faint">
                      {mode === 'doer' ? 'Quest Doer' : 'Quest Poster'}
                    </p>
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
