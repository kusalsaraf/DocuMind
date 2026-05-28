import { useEffect, useState } from 'react'
import Header from './components/Layout/Header'
import UploadTab from './components/Upload/UploadTab'
import KnowledgeBaseTab from './components/KnowledgeBase/KnowledgeBaseTab'
import ChatTab from './components/Chat/ChatTab'
import ChatSidebar from './components/Chat/ChatSidebar'
import { getFiles } from './api/client'
import { useAppStore } from './store/useAppStore'

export type Tab = 'upload' | 'knowledge-base' | 'chat'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('upload')
  const setFiles = useAppStore((s) => s.setFiles)
  const { activeSessionId, pendingNewChat, setPendingNewChat } = useAppStore()

  useEffect(() => {
    getFiles().then((res) => setFiles(res.data)).catch(() => {})
  }, [setFiles])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    if (tab === 'chat' && !activeSessionId && !pendingNewChat) {
      setPendingNewChat(true)
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col">
      <Header activeTab={activeTab} onTabChange={handleTabChange} />

      {activeTab === 'chat' ? (
        <div className="flex flex-1 overflow-hidden">
          <ChatSidebar />
          <ChatTab />
        </div>
      ) : (
        <main className="max-w-6xl mx-auto px-4 py-6 w-full">
          {activeTab === 'upload' && <UploadTab />}
          {activeTab === 'knowledge-base' && <KnowledgeBaseTab />}
        </main>
      )}
    </div>
  )
}

export default App
