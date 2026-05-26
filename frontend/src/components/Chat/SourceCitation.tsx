import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText, Sheet } from 'lucide-react'
import type { Source } from '../../types'

function cleanExcerpt(text: string): string {
  return text
    .replace(/\|[-:\s|]+\|/g, '')   // strip markdown table separator rows
    .replace(/Sheet:.*?\n/g, '')     // strip "Sheet: xxx" header
    .replace(/\|/g, ' ')             // replace pipes with spaces
    .replace(/\s+/g, ' ')            // collapse whitespace
    .trim()
    .slice(0, 160)
}

function deduplicate(sources: Source[]): Source[] {
  const seen = new Map<string, Source>()
  for (const src of sources) {
    const key = `${src.file_name}::${src.page ?? ''}`
    if (!seen.has(key) || (src.score ?? 0) > (seen.get(key)!.score ?? 0)) {
      seen.set(key, src)
    }
  }
  return Array.from(seen.values())
}

function isExcel(name: string) {
  return name.endsWith('.xlsx') || name.endsWith('.xls')
}

interface Props {
  sources: Source[]
}

export default function SourceCitation({ sources }: Props) {
  const [open, setOpen] = useState(false)
  const unique = deduplicate(sources)

  if (unique.length === 0) return null

  return (
    <div className="mt-2 text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors py-1"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        <span>{unique.length} source{unique.length > 1 ? 's' : ''} used</span>
      </button>

      {open && (
        <div className="mt-1 space-y-1.5">
          {unique.map((src, i) => {
            const excel = isExcel(src.file_name)
            const excerpt = cleanExcerpt(src.excerpt)
            const location = src.page
              ? excel ? `Sheet: ${src.page}` : `Page ${src.page}`
              : null

            return (
              <div
                key={i}
                className="flex gap-2.5 p-2.5 rounded-lg border border-gray-100 bg-gray-50"
              >
                <div className="shrink-0 mt-0.5">
                  {excel
                    ? <Sheet className="w-3.5 h-3.5 text-emerald-500" />
                    : <FileText className="w-3.5 h-3.5 text-red-400" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-gray-700 truncate">
                      {src.file_name}
                    </span>
                    {location && (
                      <span className="shrink-0 px-1.5 py-0.5 bg-white border border-gray-200 text-gray-500 rounded text-[10px]">
                        {location}
                      </span>
                    )}
                  </div>
                  {excerpt && (
                    <p className="text-gray-500 leading-relaxed line-clamp-2">{excerpt}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
