import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <Compass size={32} className="text-text-muted" />
      <h1 className="mt-4 text-2xl text-text">Nothing out here</h1>
      <p className="mt-1.5 text-sm text-text-muted">That page doesn't exist, or it's moved.</p>
      <Link to="/" className="mt-5 text-sm font-medium text-primary hover:underline">
        Back to SideQuest
      </Link>
    </div>
  );
}
