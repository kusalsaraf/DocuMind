import { Trash2, Download, FileText, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import type { FileRecord } from '../../types'
import { deleteFile, getFileViewUrl } from '../../api/client'
import { useAppStore } from '../../store/useAppStore'

interface Props {
  file: FileRecord
}

const STATUS_STYLES: Record<string, string> = {
  uploaded: 'bg-gray-100 text-gray-700',
  processing: 'bg-yellow-100 text-yellow-700',
  indexed: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  uploaded: 'Uploaded',
  processing: 'Processing…',
  indexed: 'Indexed ✓',
  error: 'Error ✗',
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileItem({ file }: Props) {
  const removeFile = useAppStore((s) => s.removeFile)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Delete "${file.name}"?`)) return
    setDeleting(true)
    try {
      await deleteFile(file.id)
      removeFile(file.id)
    } catch {
      alert('Failed to delete file.')
      setDeleting(false)
    }
  }

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = getFileViewUrl(file.id)
    a.download = file.name
    a.click()
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {file.type === 'pdf' ? (
            <FileText className="w-4 h-4 text-red-500 shrink-0" />
          ) : (
            <FileSpreadsheet className="w-4 h-4 text-green-600 shrink-0" />
          )}
          <span className="text-sm text-gray-900 truncate max-w-xs">{file.name}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-gray-500">{formatSize(file.size)}</td>
      <td className="py-3 px-4 text-sm text-gray-500 uppercase">{file.type}</td>
      <td className="py-3 px-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[file.status] ?? ''}`}>
          {STATUS_LABELS[file.status] ?? file.status}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1 text-gray-500 hover:text-red-600 transition-colors disabled:opacity-40"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}
