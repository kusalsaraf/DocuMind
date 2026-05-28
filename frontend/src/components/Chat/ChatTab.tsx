import { useEffect, useRef, useState } from 'react'
import { SendHorizontal, MessageSquare, BookOpen, ArrowRight } from 'lucide-react'
import { createSession, deleteSession, sendChat, updateSessionTitle } from '../../api/client'
import { useAppStore } from '../../store/useAppStore'
import MessageList from './MessageList'
import type { Message } from '../../types'

export default function ChatTab() {
  const {
    messages,
    addMessage,
    activeSessionId,
    sessions,
    addSession,
    removeSession,
    setActiveSession,
    updateSessionTitle: updateTitleInStore,
    files,
    pendingNewChat,
    setPendingNewChat,
  } = useAppStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const hasIndexed = files.some((f) => f.status === 'indexed')
  const activeSession = sessions.find((s) => s.id === activeSessionId)

  useEffect(() => {
    inputRef.current?.focus()
  }, [activeSessionId])

  const handleSend = async () => {
    const question = input.trim()
    if (!question || loading) return

    let sessionId = activeSessionId

    // Lazy session creation: create the backend session on first message
    if (pendingNewChat) {
      try {
        const res = await createSession()
        addSession(res.data)
        setActiveSession(res.data.id)
        setPendingNewChat(false)
        sessionId = res.data.id
      } catch {
        return
      }
    }

    if (!sessionId) return

    const isFirstMessage = messages.length === 0

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    }
    addMessage(userMsg)
    setInput('')
    setLoading(true)

    try {
      const res = await sendChat(sessionId, question)
      const assistantMsg: Message = {
        id: res.data.message_id,
        role: 'assistant',
        content: res.data.answer,
        sources: res.data.sources,
        timestamp: new Date(),
      }
      addMessage(assistantMsg)

      if (isFirstMessage) {
        const title = question.slice(0, 50)
        updateTitleInStore(sessionId, title)
        updateSessionTitle(sessionId, title).catch(() => {})
      }
    } catch {
      // If this was the very first message on a newly created session, delete
      // the empty session so it doesn't linger in the sidebar.
      if (isFirstMessage && sessionId) {
        deleteSession(sessionId).catch(() => {})
        removeSession(sessionId)
        setPendingNewChat(true)
      }
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date(),
      })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // No session selected and no pending new chat
  if (!activeSessionId && !pendingNewChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gray-50">
        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
          <MessageSquare className="w-7 h-7 text-blue-600" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-700 text-lg">Start a conversation</p>
          <p className="text-sm text-gray-400 mt-1">Click <strong>New Chat</strong> in the sidebar to begin</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Chat header — session title */}
      {activeSession && (
        <div className="shrink-0 px-5 py-3 border-b border-gray-100 bg-white">
          <p className="text-sm font-medium text-gray-700 truncate">{activeSession.title}</p>
        </div>
      )}

      {/* Empty state */}
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          {hasIndexed ? (
            <>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">Ready to answer your questions</p>
                <p className="text-sm text-gray-400 mt-1">Ask anything about your uploaded documents</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {['Summarise the document', 'What are the key points?', 'Explain in simple terms'].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); inputRef.current?.focus() }}
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">No documents indexed yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Go to <strong>Upload Docs</strong> → <strong>Index</strong> to get started
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Message list */}
      {messages.length > 0 && <MessageList messages={messages} loading={loading} />}

      {/* Input bar */}
      <div className="shrink-0 border-t border-gray-200 px-4 py-3 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasIndexed ? 'Ask a question…' : 'Index your documents first to start chatting…'}
            disabled={!hasIndexed || loading}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 max-h-32 overflow-y-auto"
            style={{ minHeight: '44px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !hasIndexed || loading}
            className="shrink-0 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <SendHorizontal className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-300 mt-1.5 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
