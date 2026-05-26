import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, AlertCircle } from 'lucide-react'
import { getFiles, uploadFile } from '../../api/client'
import { useAppStore } from '../../store/useAppStore'
import FileList from './FileList'

export default function UploadTab() {
  const { files, setFiles, addFile } = useAppStore()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getFiles()
      .then((res) => setFiles(res.data))
      .catch(() => {})
  }, [setFiles])

  const onDrop = useCallback(
    async (accepted: File[]) => {
      setError(null)
      setUploading(true)
      for (const file of accepted) {
        try {
          const res = await uploadFile(file)
          addFile(res.data)
        } catch (err: unknown) {
          const msg =
            (err as { response?: { data?: { detail?: string } } })?.response?.data
              ?.detail ?? 'Upload failed.'
          setError(`${file.name}: ${msg}`)
        }
      }
      setUploading(false)
    },
    [addFile]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxSize: 20 * 1024 * 1024,
    onDropRejected: (rejections) => {
      const msg = rejections[0]?.errors[0]?.message ?? 'File rejected.'
      setError(msg)
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Upload Documents</h2>
        <p className="text-sm text-gray-500 mt-1">
          Supported formats: PDF, Excel (.xlsx, .xls) · Max 20 MB per file
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto w-10 h-10 text-gray-400 mb-3" />
        {isDragActive ? (
          <p className="text-blue-600 font-medium">Drop files here…</p>
        ) : (
          <>
            <p className="text-gray-700 font-medium">
              Drag & drop files here, or{' '}
              <span className="text-blue-600">browse</span>
            </p>
            <p className="text-sm text-gray-400 mt-1">PDF and Excel files only</p>
          </>
        )}
        {uploading && (
          <p className="text-sm text-blue-600 mt-2 animate-pulse">Uploading…</p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <FileList files={files} />
    </div>
  )
}
