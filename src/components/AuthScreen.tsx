import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Building2,
  Mail,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fields } from '../lib/constants'
import type { Role } from '../lib/types'

type Mode = 'signin' | 'signup'

export default function AuthScreen({
  initialRole = 'student',
  onBack,
}: {
  initialRole?: Role
  onBack: () => void
}) {
  const { signIn, signUp, needsConfirmation } = useAuth()
  const [mode, setMode] = useState<Mode>('signup')
  const [role, setRole] = useState<Role>(initialRole)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [field, setField] = useState('')
  const [gradYear, setGradYear] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email.trim(), password)
        if (error) setError(error)
      } else {
        if (!name.trim()) {
          setError(role === 'employer' ? 'Enter a contact name.' : 'Enter your name.')
          return
        }
        if (role === 'employer' && !company.trim()) {
          setError('Enter your company name.')
          return
        }
        const { error } = await signUp(email.trim(), password, {
          role,
          name: name.trim(),
          company: company.trim(),
          field: field || undefined,
          graduation_year: gradYear || undefined,
        })
        if (error) setError(error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  if (needsConfirmation) {
    return (
      <Shell onBack={onBack}>
        <div className="text-center">
          <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <Mail className="h-7 w-7" />
          </span>
          <h1 className="text-[26px] font-semibold tracking-tight text-ink">
            Check your inbox
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-[15px] text-ink-muted">
            We’ve sent a confirmation link to <strong>{email}</strong>. Click it to
            activate your account, then come back and sign in.
          </p>
          <button
            onClick={() => {
              setMode('signin')
              window.location.reload()
            }}
            className="btn-primary mt-6 px-5 py-2.5 text-[15px]"
          >
            Back to sign in
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell onBack={onBack}>
      <div className="mb-6 text-center">
        <h1 className="text-[28px] font-semibold tracking-tight text-ink">
          {mode === 'signin' ? 'Welcome back' : 'Join JèrriConnect'}
        </h1>
        <p className="mt-1 text-[15px] text-ink-muted">
          {mode === 'signin'
            ? 'Sign in to pick up where you left off.'
            : 'Bring your talent — or find it — back to the Rock.'}
        </p>
      </div>

      {/* Role selector (sign up only) */}
      <AnimatePresence initial={false}>
        {mode === 'signup' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-5 grid grid-cols-2 gap-2.5">
              {(
                [
                  { r: 'student' as Role, icon: GraduationCap, label: 'I’m a student', sub: 'Get discovered' },
                  { r: 'employer' as Role, icon: Building2, label: 'I’m hiring', sub: 'Find talent' },
                ]
              ).map((o) => {
                const active = role === o.r
                return (
                  <button
                    key={o.r}
                    type="button"
                    onClick={() => setRole(o.r)}
                    className={`flex flex-col items-start gap-1 rounded-2xl border p-3.5 text-left transition-all ${
                      active
                        ? 'border-sea-400 bg-sea-50 ring-4 ring-sea-500/10'
                        : 'border-granite-200 bg-white hover:border-granite-300'
                    }`}
                  >
                    <o.icon
                      className={`h-5 w-5 ${active ? 'text-sea-600' : 'text-ink-faint'}`}
                    />
                    <span className="text-[14px] font-semibold text-ink">{o.label}</span>
                    <span className="text-[12px] text-ink-muted">{o.sub}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={submit} className="space-y-3">
        {mode === 'signup' && (
          <>
            <Labeled label={role === 'employer' ? 'Contact name' : 'Full name'}>
              <input
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'employer' ? 'e.g. Sarah Perchard' : 'e.g. Amélie Le Feuvre'}
                autoComplete="name"
              />
            </Labeled>
            {role === 'employer' ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Labeled label="Company">
                  <input
                    className="field"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Carey Olsen"
                  />
                </Labeled>
                <Labeled label="Industry">
                  <select
                    className="field cursor-pointer"
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {fields.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </Labeled>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Labeled label="Degree field">
                  <select
                    className="field cursor-pointer"
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {fields.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </Labeled>
                <Labeled label="Graduation year">
                  <select
                    className="field cursor-pointer"
                    value={gradYear}
                    onChange={(e) => setGradYear(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {[2025, 2026, 2027, 2028, 2029].map((y) => (
                      <option key={y}>{y}</option>
                    ))}
                  </select>
                </Labeled>
              </div>
            )}
          </>
        )}

        <Labeled label="Email">
          <input
            type="email"
            required
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Labeled>
        <Labeled label="Password">
          <input
            type="password"
            required
            minLength={6}
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
        </Labeled>

        {error && (
          <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[13.5px] text-rose-600">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-accent w-full py-3 text-[15px]">
          {busy ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
          ) : (
            <>
              {mode === 'signin' ? 'Sign in' : 'Create account'}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-5 flex items-center justify-center gap-1.5 text-[14px]">
        <span className="text-ink-muted">
          {mode === 'signin' ? 'New to JèrriConnect?' : 'Already have an account?'}
        </span>
        <button
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError(null)
          }}
          className="font-semibold text-sea-600 hover:text-sea-800"
        >
          {mode === 'signin' ? 'Create one' : 'Sign in'}
        </button>
      </div>

      {mode === 'signup' && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[12px] text-ink-faint">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Free while we’re in beta · no card required
        </p>
      )}
    </Shell>
  )
}

function Shell({ children, onBack }: { children: ReactNode; onBack: () => void }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-sea-200/70 via-sea-100/40 to-transparent blur-3xl" />
        <div className="absolute inset-0 grain opacity-60" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <button
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-1.5 self-start text-[14px] font-medium text-ink-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sea-400 to-sea-700 shadow-soft">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path d="M7 15c2 2 8 2 10 0" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="8.5" cy="9.5" r="1.5" fill="white" />
              <circle cx="15.5" cy="9.5" r="1.5" fill="white" />
            </svg>
          </span>
          <span className="text-[18px] font-semibold tracking-tight text-ink">
            Jèrri<span className="text-sea-600">Connect</span>
          </span>
        </div>

        <div className="rounded-4xl border border-granite-200/70 bg-white/80 p-7 shadow-float backdrop-blur-xl">
          {children}
        </div>
      </div>
    </div>
  )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  )
}
