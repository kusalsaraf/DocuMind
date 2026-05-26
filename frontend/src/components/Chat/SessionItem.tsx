import { Trash2 } from 'lucide-react'
import type { ChatSession } from '../../types'

interface Props {
  session: ChatSession
  isActive: boolean
  onClick: () => void
  onDelete: () => void
}

export default function SessionItem({ session, isActive, onClick, onDelete }: Props) {
  return (
    <div
      onClick={onClick}
      className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <span className="text-sm truncate flex-1 min-w-0">{session.title}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
        title="Delete chat"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
