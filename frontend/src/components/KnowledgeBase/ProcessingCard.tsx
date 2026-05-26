import { useEffect, useRef } from 'react'
import { FileText, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import type { FileRecord } from '../../types'
import { getFileStatus, processFile } from '../../api/client'
import { useAppStore } from '../../store/useAppStore'

interface Props {
  file: FileRecord
}

const STATUS_CONFIG = {
  uploaded: {
    icon: <Clock className="w-5 h-5 text-gray-400" />,
    label: 'Not indexed',
    labelClass: 'text-gray-500',
    bg: 'bg-white',
  },
  processing: {
    icon: <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />,
    label: 'Processing…',
    labelClass: 'text-yellow-600',
    bg: 'bg-yellow-50',
  },
  indexed: {
    icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    label: 'Indexed ✓',
    labelClass: 'text-green-600',
    bg: 'bg-green-50',
  },
  error: {
    icon: <AlertCircle className="w-5 h-5 text-red-500" />,
    label: 'Error',
    labelClass: 'text-red-600',
    bg: 'bg-red-50',
  },
}

export default function ProcessingCard({ file }: Props) {
  const updateFileStatus = useAppStore((s) => s.updateFileStatus)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startPolling = () => {
    if (pollingRef.current) return
    pollingRef.current = setInterval(async () => {
      try {
        const res = await getFileStatus(file.id)
        const { status, error_msg } = res.data as { status: FileRecord['status']; error_msg?: string }
        updateFileStatus(file.id, status, error_msg)
        if (status !== 'processing') {
          clearInterval(pollingRef.current!)
          pollingRef.current = null
        }
      } catch {
        clearInterval(pollingRef.current!)
        pollingRef.current = null
      }
    }, 2000)
  }

  useEffect(() => {
    if (file.status === 'processing') startPolling()
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [file.status])

  const handleProcess = async () => {
    try {
      await processFile(file.id)
      updateFileStatus(file.id, 'processing')
      startPolling()
    } catch {
      alert('Failed to start processing.')
    }
  }

  const config = STATUS_CONFIG[file.status] ?? STATUS_CONFIG.uploaded

  return (
    <div className={`rounded-lg border border-gray-200 p-4 flex items-center justify-between gap-4 ${config.bg}`}>
      <div className="flex items-center gap-3 min-w-0">
        {file.type === 'pdf' ? (
          <FileText className="w-5 h-5 text-red-400 shrink-0" />
        ) : (
          <FileSpreadsheet className="w-5 h-5 text-green-500 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
          {file.error_msg && (
            <p className="text-xs text-red-500 truncate mt-0.5">{file.error_msg}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          {config.icon}
          <span className={`text-sm font-medium ${config.labelClass}`}>{config.label}</span>
        </div>
        {(file.status === 'uploaded' || file.status === 'error') && (
          <button
            onClick={handleProcess}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Process
          </button>
        )}
      </div>
    </div>
  )
}
