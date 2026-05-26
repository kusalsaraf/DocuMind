import { BookOpen } from 'lucide-react'
import type { Tab } from '../../App'

interface Props {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const STEPS: { id: Tab; label: string; step: number }[] = [
  { id: 'upload', label: 'Upload Docs', step: 1 },
  { id: 'knowledge-base', label: 'Index', step: 2 },
  { id: 'chat', label: 'Chat', step: 3 },
]

export default function Header({ activeTab, onTabChange }: Props) {
  const activeIndex = STEPS.findIndex((s) => s.id === activeTab)

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">DocuMind</h1>
          </div>

          {/* Step nav */}
          <nav className="flex items-center gap-1">
            {STEPS.map((tab, i) => {
              const isActive = tab.id === activeTab
              const isDone = i < activeIndex

              return (
                <div key={tab.id} className="flex items-center">
                  <button
                    onClick={() => onTabChange(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isDone
                        ? 'text-blue-600 hover:bg-blue-50'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold shrink-0 ${
                        isActive
                          ? 'bg-white text-blue-600'
                          : isDone
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isDone ? '✓' : tab.step}
                    </span>
                    {tab.label}
                  </button>

                  {i < STEPS.length - 1 && (
                    <span className="mx-1 text-gray-300 text-xs">›</span>
                  )}
                </div>
              )
            })}
          </nav>
        </div>
      </div>
    </header>
  )
}
