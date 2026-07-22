import { motion } from 'framer-motion'
import { rankFor } from '../lib/constants'

export default function XPBar({
  xp,
  size = 'md',
}: {
  xp: number
  size?: 'sm' | 'md'
}) {
  const { current, next, progress } = rankFor(xp)

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-end justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex items-center justify-center rounded-full bg-clay-50 text-clay-600 ${
              size === 'md' ? 'h-9 w-9' : 'h-7 w-7'
            }`}
          >
            <current.icon className={size === 'md' ? 'h-5 w-5' : 'h-4 w-4'} />
          </span>
          <div>
            <p
              className={`font-semibold tracking-tight text-ink ${
                size === 'md' ? 'text-[17px]' : 'text-[14px]'
              }`}
            >
              {current.name}
            </p>
            <p className="text-[12px] text-ink-muted">
              {next
                ? `${xp - current.min} / ${next.min - current.min} XP to ${next.name}`
                : 'Max rank reached — legendary!'}
            </p>
          </div>
        </div>
        <span
          className={`font-bold text-jersey-600 ${size === 'md' ? 'text-[20px]' : 'text-[15px]'}`}
        >
          {xp.toLocaleString()} XP
        </span>
      </div>

      <div
        className={`relative w-full overflow-hidden rounded-full bg-jersey-100 ${
          size === 'md' ? 'h-3.5' : 'h-2.5'
        }`}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(progress * 100, next ? 3 : 100)}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative h-full rounded-full bg-gradient-to-r from-jersey-500 to-jersey-700"
        >
          <div
            className="absolute inset-0 rounded-full opacity-60"
            style={{
              background:
                'linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.55) 50%, transparent 80%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2.4s linear infinite',
            }}
          />
        </motion.div>
      </div>
    </div>
  )
}
