import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Swords, Home, Mail, Loader2, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { parishes } from '../lib/constants'
import type { Role } from '../lib/types'
import { LogoMark, Wordmark } from './Logo'

type Mode = 'signin' | 'signup'

export default function AuthScreen({
  initialRole = 'doer',
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
  const [parish, setParish] = useState('')
  const [kind, setKind] = useState('resident')

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
          setError('Tell us your name.')
          return
        }
        const { error } = await signUp(email.trim(), password, {
          role,
          name: name.trim(),
          parish: parish || undefined,
          kind: role === 'poster' ? kind : undefined,
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
          <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-jersey-100 text-jersey-600">
            <Mail className="h-7 w-7" />
          </span>
          <h1 className="text-[26px] font-semibold tracking-tight text-ink">Check your inbox</h1>
          <p className="mx-auto mt-2 max-w-sm text-[15px] text-ink-muted">
            We’ve sent a confirmation link to <strong>{email}</strong>. Click it to activate
            your account, then come back and log in.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary mt-6 px-5 py-2.5 text-[15px]"
          >
            Back to log in
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell onBack={onBack}>
      <div className="mb-6 text-center">
        <h1 className="display text-[28px] font-semibold text-ink">
          {mode === 'signin' ? 'Welcome back, adventurer' : 'Join SideQuest'}
        </h1>
        <p className="mt-1 text-[15px] text-ink-muted">
          {mode === 'signin'
            ? 'Log in to pick up your quests.'
            : 'Earn money, help neighbours, conquer the Rock.'}
        </p>
      </div>

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
                  { r: 'doer' as Role, icon: Swords, label: 'Quest Doer', sub: 'Earn & level up' },
                  { r: 'poster' as Role, icon: Home, label: 'Quest Poster', sub: 'Get a hand' },
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
                        ? 'border-jersey-400 bg-jersey-50 ring-4 ring-jersey-500/10'
                        : 'border-granite-200 bg-white hover:border-granite-300'
                    }`}
                  >
                    <o.icon className={`h-5 w-5 ${active ? 'text-jersey-600' : 'text-ink-faint'}`} />
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
            <Labeled label={role === 'poster' ? 'Your name or business name' : 'Your name'}>
              <input
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'poster' ? 'e.g. The Green Thumb Café' : 'e.g. Charlie'}
                autoComplete="name"
              />
            </Labeled>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Labeled label="Home parish">
                <select
                  className="field cursor-pointer"
                  value={parish}
                  onChange={(e) => setParish(e.target.value)}
                >
                  <option value="">Select…</option>
                  {parishes.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Labeled>
              {role === 'poster' && (
                <Labeled label="I'm a…">
                  <select
                    className="field cursor-pointer"
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    <option value="resident">Resident</option>
                    <option value="business">Small business</option>
                  </select>
                </Labeled>
              )}
            </div>
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
          <p className="rounded-xl bg-jersey-50 px-3.5 py-2.5 text-[13.5px] text-jersey-700">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-accent w-full py-3 text-[15px]">
          {busy ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
          ) : (
            <>
              {mode === 'signin' ? 'Log in' : 'Create account'}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-5 flex items-center justify-center gap-1.5 text-[14px]">
        <span className="text-ink-muted">
          {mode === 'signin' ? 'New to SideQuest?' : 'Already have an account?'}
        </span>
        <button
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError(null)
          }}
          className="font-semibold text-jersey-600 hover:text-jersey-800"
        >
          {mode === 'signin' ? 'Create one' : 'Log in'}
        </button>
      </div>

      {mode === 'signup' && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[12px] text-ink-faint">
          <Sparkles className="h-3.5 w-3.5" />
          Free to join · no card required
        </p>
      )}
    </Shell>
  )
}

function Shell({ children, onBack }: { children: ReactNode; onBack: () => void }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-jersey-200/70 via-jersey-100/40 to-transparent blur-3xl" />
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
          <LogoMark className="h-9 w-9" />
          <Wordmark className="text-[18px]" />
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
