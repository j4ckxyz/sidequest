import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Nav, { type View } from './components/Nav'
import Landing from './components/Landing'
import StudentDashboard from './pages/StudentDashboard'
import EmployerPortal from './pages/EmployerPortal'
import HolidayHub from './pages/HolidayHub'
import { ToastProvider } from './components/Toast'

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

export default function App() {
  const [view, setView] = useState<View>('home')

  return (
    <ToastProvider>
      <div className="min-h-screen bg-white">
        <Nav view={view} setView={setView} />
        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {view === 'home' && <Landing setView={setView} />}
              {view === 'student' && <StudentDashboard goHub={() => setView('hub')} />}
              {view === 'employer' && <EmployerPortal />}
              {view === 'hub' && <HolidayHub />}
            </motion.div>
          </AnimatePresence>
        </main>
        {view !== 'home' && <Footer />}
      </div>
    </ToastProvider>
  )
}
