export interface FileRecord {
  id: string
  name: string
  size: number
  type: string
  status: 'uploaded' | 'processing' | 'indexed' | 'error'
  error_msg?: string
  created_at: string
}

export interface Source {
  file_name: string
  page?: string
  excerpt: string
  score?: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  timestamp: string | Date
}

export interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface MessageResponse {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  created_at: string
}

export interface ChatResponse {
  message_id: string
  answer: string
  sources: Source[]
}
