import { createContext, useContext, type ReactNode } from 'react'

export interface ChatTarget {
  questId: string
  doerId: string
  questTitle: string
  otherName: string
}

interface ChatNavValue {
  openChat: (t: ChatTarget) => void
}

const ChatContext = createContext<ChatNavValue | null>(null)

export function useChatNav() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatNav must be used within ChatProvider')
  return ctx
}

export function ChatProvider({
  openChat,
  children,
}: {
  openChat: (t: ChatTarget) => void
  children: ReactNode
}) {
  return <ChatContext.Provider value={{ openChat }}>{children}</ChatContext.Provider>
}
