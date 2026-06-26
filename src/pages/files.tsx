import { useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import {
  WORKSPACE_ALL_FILES,
  WORKSPACE_FILE_TABS,
} from '@/lib/constants'
import { cn } from '@/lib/utils'

export function FilesPage() {
  const [activeTab, setActiveTab] = useState<(typeof WORKSPACE_FILE_TABS)[number]['id']>('mine')

  return (
    <div className="workspace-home files-page">
      <div className="files-toolbar">
        <div className="files-tabs" role="tablist" aria-label="文件分类">
          {WORKSPACE_FILE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={cn('files-tab', activeTab === tab.id && 'is-active')}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button type="button" className="files-search-btn" aria-label="搜索文件">
          <Search className="h-4 w-4" />
        </button>
      </div>

      <div className="files-filter">
        <button type="button" className="files-filter-btn">
          全部文件
          <ChevronDown className="h-4 w-4 opacity-60" />
        </button>
      </div>

      {activeTab === 'mine' ? (
        <ul className="workspace-recent-list files-list">
          {WORKSPACE_ALL_FILES.map((file) => (
            <li key={file.id}>
              <button type="button" className="workspace-recent-item w-full text-left">
                <div className="workspace-recent-main">
                  <p className="workspace-recent-name">
                    {file.live && <span className="workspace-recent-live" aria-hidden="true" />}
                    {file.title}
                  </p>
                  {file.subtitle && (
                    <p className="workspace-recent-subtitle">{file.subtitle}</p>
                  )}
                </div>
                <div className="workspace-recent-meta">
                  <span>{file.duration}</span>
                  <span>{file.date}</span>
                  <span>{file.source}</span>
                  {file.tag && <span className="workspace-recent-tag">{file.tag}</span>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="files-empty">
          <p>{activeTab === 'star' ? '暂无收藏文件' : '回收站为空'}</p>
        </div>
      )}

      <p className="files-ai-note">以上内容由人工智能生成</p>
    </div>
  )
}
