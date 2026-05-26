import type { FileRecord } from '../../types'
import FileItem from './FileItem'

interface Props {
  files: FileRecord[]
}

export default function FileList({ files }: Props) {
  if (files.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm">No files uploaded yet.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-left">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
          <tr>
            <th className="py-3 px-4">Name</th>
            <th className="py-3 px-4">Size</th>
            <th className="py-3 px-4">Type</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f) => (
            <FileItem key={f.id} file={f} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
