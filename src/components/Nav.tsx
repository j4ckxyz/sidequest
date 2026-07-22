import { motion } from 'framer-motion'
import { GraduationCap, Search, CalendarHeart } from 'lucide-react'

export type View = 'home' | 'student' | 'employer' | 'hub'

const tabs: { id: View; label: string; icon: typeof Search }[] = [
  { id: 'student', label: 'For Students', icon: GraduationCap },
  { id: 'employer', label: 'For Employers', icon: Search },
  { id: 'hub', label: 'Holiday Hub', icon: CalendarHeart },
]

export default function Nav({
  view,
  setView,
}: {
  view: View
  setView: (v: View) => void
}) {
  return (
    <header className="sticky top-0 z-50 flex justify-center px-4 pt-4">
      <nav className="flex w-full max-w-6xl items-center justify-between gap-4 rounded-full border border-white/60 bg-white/70 py-2 pl-4 pr-2 shadow-glass backdrop-blur-xl">
        <button
          onClick={() => setView('home')}
          className="group flex items-center gap-2.5"
          aria-label="JèrriConnect home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sea-400 to-sea-700 shadow-soft transition-transform group-hover:scale-105">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path
                d="M7 15c2 2 8 2 10 0"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <circle cx="8.5" cy="9.5" r="1.5" fill="white" />
              <circle cx="15.5" cy="9.5" r="1.5" fill="white" />
            </svg>
          </span>
          <span className="text-[17px] font-semibold tracking-tight text-ink">
            Jèrri<span className="text-sea-600">Connect</span>
          </span>
        </button>

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

        <button
          onClick={() => setView('student')}
          className="btn-primary text-[14px]"
        >
          Get started
        </button>
      </nav>
    </header>
  )
}
