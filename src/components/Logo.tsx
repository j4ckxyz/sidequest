export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <span
      className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-jersey-500 to-jersey-700 shadow-redglow ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]" fill="none">
        <path d="M8 4v16" stroke="white" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M9 5l9 2.6-9 2.6z" fill="white" />
      </svg>
    </span>
  )
}

export function Wordmark({ className = 'text-[17px]' }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight text-ink ${className}`}>
      Side<span className="text-jersey-600">Quest</span>
    </span>
  )
}
