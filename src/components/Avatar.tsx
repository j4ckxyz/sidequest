interface AvatarProps {
  initials: string
  gradient: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  ring?: boolean
}

const sizes = {
  sm: 'h-9 w-9 text-[13px]',
  md: 'h-12 w-12 text-base',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-20 w-20 text-2xl',
}

export default function Avatar({ initials, gradient, size = 'md', ring }: AvatarProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br ${gradient} font-semibold text-white shadow-soft ${sizes[size]} ${
        ring ? 'ring-4 ring-white' : ''
      }`}
    >
      {initials}
    </span>
  )
}
