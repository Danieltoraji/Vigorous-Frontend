import { useState } from 'react'
import { useTemplates } from '../../hooks/useTemplates.jsx'
import './explorer_templates.css'
import { useNavigate } from 'react-router-dom'

function ExplorerTemplates() {
  const { templatesData, loading, error, deleteTemplate } = useTemplates()
  const [viewMode, setViewMode] = useState('card') // 'card' or 'list'
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [moreActionsOpen, setMoreActionsOpen] = useState(null)
  const navigate = useNavigate()

  const onBack = () => {
    navigate('/menu')
  }
  
  // 提取所有标签
  const allTags = new Set()
  Object.values(templatesData).forEach(template => {
    if (template.piece_tags) {
      template.piece_tags.forEach(tag => allTags.add(tag))
    }
  })
  
  // 过滤模板
  const filteredTemplates = Object.values(templatesData).filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTag = !selectedTag || (template.piece_tags && template.piece_tags.includes(selectedTag))
    return matchesSearch && matchesTag
  })
  
  // 处理更多操作菜单
  const toggleMoreActions = (templateId) => {
    setMoreActionsOpen(moreActionsOpen === templateId ? null : templateId)
  }
  
  // 处理删除模板
  const handleDeleteTemplate = (templateId) => {
    if (window.confirm('确定要删除这个模板吗？')) {
      deleteTemplate(templateId)
      setMoreActionsOpen(null)
    }
  }
  
  // 处理打开模板
  const handleOpenTemplate = (template) => {
    // TODO: 实现打开模板逻辑
  }
  
  // 处理应用到项目
  const handleApplyToProject = (template) => {
    // TODO: 实现应用模板逻辑
  }
  
  // 处理编辑信息
  const handleEditInfo = (template) => {
    setMoreActionsOpen(null)
  }

  if (loading) {
    return <div className="explorer-templates loading">加载中...</div>
  }
//
//  if (error) {
//    return <div className="explorer-templates error">错误: {error}</div>
//  }
//
  return (
    <div className="explorer-templates">
      <div className="explorer-header">
        <button className="back-button" onClick={onBack}>
          ← 返回
        </button>
        <h1>模板资源管理器</h1>
      </div>
      
      <div className="explorer-content">
        <div className="left-sidebar">
          <div className="filter-section">
            <h2>按标签筛选</h2>
            <div className="tag-filters">
              <button 
                className={`tag-filter ${!selectedTag ? 'active' : ''}`}
                onClick={() => setSelectedTag('')}
              >
                全部
              </button>
              {Array.from(allTags).map(tag => (
                <button 
                  key={tag}
                  className={`tag-filter ${selectedTag === tag ? 'active' : ''}`}
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          
          <div className="search-section">
            <h2>查找模板</h2>
            <div className="search-box">
              <input 
                type="text" 
                placeholder="输入模板名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="right-content">
          <div className="view-controls">
            <div className="view-buttons">
              <button 
                className={`view-button ${viewMode === 'card' ? 'active' : ''}`}
                onClick={() => setViewMode('card')}
              >
                卡片视图
              </button>
              <button 
                className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                列表视图
              </button>
            </div>
          </div>
          
          {viewMode === 'card' ? (
            <div className="template-grid">
              {filteredTemplates.map(template => (
                <div key={template.id} className="template-card">
                  <div className="template-card-header">
                    <h3 className="template-name">{template.name}</h3>
                  </div>
                  
                  <div className="template-card-body">
                    <p className="template-description">
                      {template.description || '暂无描述'}
                    </p>
                    
                    <div className="template-meta">
                      <div className="template-meta-item">
                        <span className="meta-label">ID：</span>
                        <span className="meta-value">{template.id}</span>
                      </div>
                      <div className="template-meta-item">
                        <span className="meta-label">创建时间：</span>
                        <span className="meta-value">{template.created_at}</span>
                      </div>
                      <div className="template-meta-item">
                        <span className="meta-label">修改时间：</span>
                        <span className="meta-value">{template.edited_at}</span>
                      </div>
                    </div>
                    
                    <div className="template-tags">
                      {template.piece_tags && template.piece_tags.length > 0 ? (
                        template.piece_tags.map((tag, index) => (
                          <span key={index} className="template-tag">{tag}</span>
                        ))
                      ) : (
                        <span className="template-tag">无标签</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="template-card-footer">
                    <div className="template-actions">
                      <button 
                        className="btn btn-secondary"
                        onClick={() => handleOpenTemplate(template)}
                      >
                        打开
                      </button>
                      <button 
                        className="btn btn-primary"
                        onClick={() => handleApplyToProject(template)}
                      >
                        应用到项目
                      </button>
                      <div className="more-actions">
                        <button 
                          className="btn btn-outline"
                          onClick={() => toggleMoreActions(template.id)}
                        >
                          更多操作
                        </button>
                        {moreActionsOpen === template.id && (
                          <div className="more-actions-menu">
                            <button 
                              className="menu-item"
                              onClick={() => handleEditInfo(template)}
                            >
                              编辑信息
                            </button>
                            <button 
                              className="menu-item delete"
                              onClick={() => handleDeleteTemplate(template.id)}
                            >
                              删除
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="template-list">
              <table>
                <thead>
                  <tr>
                    <th>标题</th>
                    <th>描述</th>
                    <th>ID</th>
                    <th>创建时间</th>
                    <th>修改时间</th>
                    <th>标签</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map(template => (
                    <tr key={template.id}>
                      <td>{template.name}</td>
                      <td>{template.description || '暂无描述'}</td>
                      <td>{template.id}</td>
                      <td>{template.created_at}</td>
                      <td>{template.edited_at}</td>
                      <td>
                        <div className="template-tags list-tags">
                          {template.piece_tags && template.piece_tags.length > 0 ? (
                            template.piece_tags.map((tag, index) => (
                              <span key={index} className="template-tag">{tag}</span>
                            ))
                          ) : (
                            <span className="template-tag">无标签</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="template-actions list-actions">
                          <button 
                            className="btn btn-secondary small"
                            onClick={() => handleOpenTemplate(template)}
                          >
                            打开
                          </button>
                          <button 
                            className="btn btn-primary small"
                            onClick={() => handleApplyToProject(template)}
                          >
                            应用
                          </button>
                          <div className="more-actions">
                            <button 
                              className="btn btn-outline small"
                              onClick={() => toggleMoreActions(template.id)}
                            >
                              更多
                            </button>
                            {moreActionsOpen === template.id && (
                              <div className="more-actions-menu">
                                <button 
                                  className="menu-item"
                                  onClick={() => handleEditInfo(template)}
                                >
                                  编辑信息
                                </button>
                                <button 
                                  className="menu-item delete"
                                  onClick={() => handleDeleteTemplate(template.id)}
                                >
                                  删除
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default ExplorerTemplates