import { MessageCircle } from 'lucide-react';

export function MessagesEmpty() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-text-muted">
      <MessageCircle size={28} />
      <p className="text-sm">Select a conversation to get started</p>
    </div>
  );
}
