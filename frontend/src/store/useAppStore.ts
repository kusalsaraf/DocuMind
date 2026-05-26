import { create } from 'zustand'
import type { ChatSession, FileRecord, Message } from '../types'

interface AppStore {
  // Files
  files: FileRecord[]
  setFiles: (files: FileRecord[]) => void
  addFile: (file: FileRecord) => void
  removeFile: (id: string) => void
  updateFileStatus: (id: string, status: FileRecord['status'], error_msg?: string) => void

  // Sessions
  sessions: ChatSession[]
  activeSessionId: string | null
  setSessions: (sessions: ChatSession[]) => void
  addSession: (session: ChatSession) => void
  removeSession: (id: string) => void
  updateSessionTitle: (id: string, title: string) => void
  setActiveSession: (id: string) => void

  // Messages (active session only)
  messages: Message[]
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  clearMessages: () => void
}

export const useAppStore = create<AppStore>((set) => ({
  // Files
  files: [],
  setFiles: (files) => set({ files }),
  addFile: (file) => set((s) => ({ files: [...s.files, file] })),
  removeFile: (id) => set((s) => ({ files: s.files.filter((f) => f.id !== id) })),
  updateFileStatus: (id, status, error_msg) =>
    set((s) => ({
      files: s.files.map((f) => (f.id === id ? { ...f, status, error_msg } : f)),
    })),

  // Sessions
  sessions: [],
  activeSessionId: null,
  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((s) => ({ sessions: [session, ...s.sessions] })),
  removeSession: (id) =>
    set((s) => ({
      sessions: s.sessions.filter((sess) => sess.id !== id),
      activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
      messages: s.activeSessionId === id ? [] : s.messages,
    })),
  updateSessionTitle: (id, title) =>
    set((s) => ({
      sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, title } : sess)),
    })),
  setActiveSession: (id) => set({ activeSessionId: id, messages: [] }),

  // Messages
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  clearMessages: () => set({ messages: [] }),
}))
