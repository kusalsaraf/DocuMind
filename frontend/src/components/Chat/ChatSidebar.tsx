import { useEffect } from 'react'
import { Plus, MessageSquare } from 'lucide-react'
import {
  createSession,
  deleteSession,
  getSessionMessages,
  getSessions,
} from '../../api/client'
import { useAppStore } from '../../store/useAppStore'
import SessionItem from './SessionItem'
import type { Message } from '../../types'

export default function ChatSidebar() {
  const {
    sessions,
    activeSessionId,
    setSessions,
    addSession,
    removeSession,
    setActiveSession,
    setMessages,
    clearMessages,
  } = useAppStore()

  useEffect(() => {
    getSessions()
      .then((res) => setSessions(res.data))
      .catch(() => {})
  }, [setSessions])

  const handleNewChat = async () => {
    try {
      const res = await createSession()
      addSession(res.data)
      setActiveSession(res.data.id)
      clearMessages()
    } catch {}
  }

  const handleSelectSession = async (id: string) => {
    if (id === activeSessionId) return
    setActiveSession(id)
    try {
      const res = await getSessionMessages(id)
      const messages: Message[] = res.data.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources,
        timestamp: m.created_at,
      }))
      setMessages(messages)
    } catch {
      setMessages([])
    }
  }

  const handleDeleteSession = async (id: string) => {
    try {
      await deleteSession(id)
      removeSession(id)
    } catch {}
  }

  return (
    <div className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-100">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
            <MessageSquare className="w-6 h-6 opacity-40" />
            <p className="text-xs">No chats yet</p>
          </div>
        ) : (
          sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              onClick={() => handleSelectSession(session.id)}
              onDelete={() => handleDeleteSession(session.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
