import axios from 'axios'
import type { ChatResponse, ChatSession, FileRecord, MessageResponse } from '../types'

const api = axios.create({ baseURL: 'http://localhost:8000' })

// --- Files ---
export const uploadFile = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<FileRecord>('/api/upload', form)
}

export const getFiles = () => api.get<FileRecord[]>('/api/files')

export const deleteFile = (id: string) => api.delete(`/api/files/${id}`)

export const getFileViewUrl = (id: string) =>
  `http://localhost:8000/api/files/${id}/view`

export const processFile = (id: string) =>
  api.post<{ file_id: string; status: string; message: string }>(`/api/process/${id}`)

export const getFileStatus = (id: string) =>
  api.get<{ file_id: string; status: string }>(`/api/status/${id}`)

// --- Chat ---
export const sendChat = (session_id: string, question: string) =>
  api.post<ChatResponse>('/api/chat', { session_id, question })

// --- Sessions ---
export const createSession = () =>
  api.post<ChatSession>('/api/sessions')

export const getSessions = () =>
  api.get<ChatSession[]>('/api/sessions')

export const deleteSession = (id: string) =>
  api.delete(`/api/sessions/${id}`)

export const getSessionMessages = (id: string) =>
  api.get<MessageResponse[]>(`/api/sessions/${id}/messages`)

export const updateSessionTitle = (id: string, title: string) =>
  api.patch<ChatSession>(`/api/sessions/${id}/title`, { title })
