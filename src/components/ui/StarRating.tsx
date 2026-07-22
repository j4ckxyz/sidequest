import { useState } from 'react';
import { Star } from 'lucide-react';
import { cx } from '../../lib/utils';

export function StarRating({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(value) ? 'fill-warning text-warning' : 'fill-surface-2 text-surface-2'}
        />
      ))}
    </div>
  );
}

export function StarRatingInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value;
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          className="p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
        >
          <Star size={26} className={cx('transition-colors', n <= display ? 'fill-warning text-warning' : 'fill-surface-2 text-surface-2')} />
        </button>
      ))}
    </div>
  );
}
