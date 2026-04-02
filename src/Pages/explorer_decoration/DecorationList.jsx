import { useState, useMemo } from 'react'
import DecorationItem from './DecorationItem.jsx'
import './DecorationList.css'


function DecorationList({ decorations, onEditDecoration, onDeleteDecoration, onUploadDecoration, onPreviewDecoration }) {
  const [selectedTag, setSelectedTag] = useState(null)

  // 统计所有标签
  const allTags = useMemo(() => {
    const tagMap = new Map()
    decorations?.forEach(decoration => {
      if (Array.isArray(decoration.decoration_tags)) {
        decoration.decoration_tags.forEach(tag => {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
        })
      }
    })
    return Array.from(tagMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [decorations])

  // 根据选中的标签筛选装饰
  const filteredDecorations = useMemo(() => {
    if (!selectedTag) return decorations
    return decorations?.filter(decoration => 
      Array.isArray(decoration.decoration_tags) && decoration.decoration_tags.includes(selectedTag)
    )
  }, [decorations, selectedTag])

  return (
    <div className="content-wrapper">
      {/* 标签筛选侧边栏 */}
      <div className="tag-sidebar">
        <h3 className="tag-sidebar-title">标签筛选</h3>
        <div className="tag-list">
          <div 
            className={`tag-item all-tags ${!selectedTag ? 'active' : ''}`}
            onClick={() => setSelectedTag(null)}
          >
            <span>全部</span>
            <span className="tag-count">{decorations?.length || 0}</span>
          </div>
          {allTags.map(([tag, count]) => (
            <div 
              key={tag}
              className={`tag-item ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => setSelectedTag(tag)}
            >
              <span>{tag}</span>
              <span className="tag-count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="decoration-list">
        <div className="decoration-list-header">
          <h2>我的装饰 {selectedTag && `- ${selectedTag}`}</h2>
          <button className="btn btn-primary" onClick={onUploadDecoration}>
            上传新装饰
          </button>
        </div>

        <div className="decoration-grid">
          {filteredDecorations?.length > 0 ? (
            filteredDecorations.map(decoration => (
              <DecorationItem
                key={decoration.id}
                decoration={decoration}
                onEditDecoration={onEditDecoration}
                onDeleteDecoration={onDeleteDecoration}
                onPreviewDecoration={onPreviewDecoration}
              />
            ))
          ) : (
            <div className="no-decoration-message">
              {selectedTag ? `没有标签为"${selectedTag}"的装饰` : '暂无装饰'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DecorationList