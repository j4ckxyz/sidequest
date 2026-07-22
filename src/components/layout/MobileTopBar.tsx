import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

/**
 * Mobile's equivalent of Navbar's logo + theme toggle — BottomNav covers navigation,
 * but without this, mobile had no way to switch theme at all (Navbar is sm:hidden).
 */
export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-canvas/85 px-4 backdrop-blur-md sm:hidden">
      <Link to="/" className="flex items-center gap-1.5 font-display text-lg text-text">
        <Compass size={19} className="text-primary" strokeWidth={2.25} />
        SideQuest
      </Link>
      <ThemeToggle />
    </header>
  );
}
