import { useEffect } from 'react'
import { Database } from 'lucide-react'
import { getFiles, processFile } from '../../api/client'
import { useAppStore } from '../../store/useAppStore'
import ProcessingCard from './ProcessingCard'

export default function KnowledgeBaseTab() {
  const { files, setFiles, updateFileStatus } = useAppStore()

  useEffect(() => {
    getFiles()
      .then((res) => setFiles(res.data))
      .catch(() => {})
  }, [setFiles])

  const handleProcessAll = async () => {
    const toProcess = files.filter(
      (f) => f.status === 'uploaded' || f.status === 'error'
    )
    for (const file of toProcess) {
      try {
        await processFile(file.id)
        updateFileStatus(file.id, 'processing')
      } catch {
        // individual errors handled in ProcessingCard
      }
    }
  }

  const hasUnprocessed = files.some(
    (f) => f.status === 'uploaded' || f.status === 'error'
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Knowledge Base</h2>
          <p className="text-sm text-gray-500 mt-1">
            Parse, chunk, embed, and index your uploaded documents.
          </p>
        </div>
        {hasUnprocessed && (
          <button
            onClick={handleProcessAll}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Database className="w-4 h-4" />
            Process All
          </button>
        )}
      </div>

      {files.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Database className="mx-auto w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">Upload documents first to build the knowledge base.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((f) => (
            <ProcessingCard key={f.id} file={f} />
          ))}
        </div>
      )}
    </div>
  )
}
