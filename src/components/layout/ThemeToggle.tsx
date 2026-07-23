import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { haptic } from '../../lib/haptics';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={() => {
        haptic('select');
        toggle();
      }}
      aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
      className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
