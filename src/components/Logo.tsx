export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <span className={`inline-flex text-clay-600 ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" className="h-full w-full">
        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" />
        <g transform="rotate(-20 50 50)">
          <path
            d="M50 26 q3 0 5 3 L65 47 q2 3 0 6 L55 71 q-2 3 -5 3 -3 0 -5 -3 L35 53 q-2 -3 0 -6 L45 29 q2 -3 5 -3 z"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </span>
  )
}

export function Wordmark({ className = 'text-[20px]' }: { className?: string }) {
  return (
    <span className={`font-serif font-semibold tracking-tight text-ink ${className}`}>
      SideQuest
    </span>
  )
}
