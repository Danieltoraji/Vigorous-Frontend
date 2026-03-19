import { useState } from 'react'
import { useTemplates } from '../../hooks/useTemplates.jsx'
import './explorer_templates.css'
import { useNavigate } from 'react-router-dom'

// 格式化日期时间
function formatDateTime(dateString) {
  if (!dateString) return '暂无'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function ExplorerTemplates() {
  const { templatesData, loading, error, deleteTemplate, createTemplate, createTemplateFromJson, updateTemplate } = useTemplates()
  const [viewMode, setViewMode] = useState('card') // 'card' or 'list'
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTags, setEditTags] = useState('')
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
  
  // 处理删除模板
  const handleDeleteTemplate = (templateId) => {
    if (window.confirm('确定要删除这个模板吗？')) {
      deleteTemplate(templateId)
    }
  }
  
  // 处理打开模板
  const handleOpenTemplate = (template) => {
    alert("open");
    // TODO: 实现打开模板逻辑
  }
  
  // 处理应用到项目
  const handleApplyToProject = (template) => {
    alert("apply");
    // TODO: 实现应用模板逻辑
  }
  
  // 处理编辑信息
  const handleEditInfo = (template) => {
    setEditingTemplate(template)
    setEditName(template.name || '')
    setEditDescription(template.description || '')
    setEditTags(template.piece_tags ? template.piece_tags.join(', ') : '')
    setShowEditModal(true)
  }
  
  // 处理关闭编辑模态框
  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditingTemplate(null)
    setEditName('')
    setEditDescription('')
    setEditTags('')
  }
  
  // 处理保存编辑
  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      alert('模板名称不能为空')
      return
    }
    
    try {
      const tagsArray = editTags.split(',').map(tag => tag.trim()).filter(tag => tag)
      await updateTemplate(editingTemplate.id, {
        name: editName,
        description: editDescription,
        piece_tags: tagsArray
      })
      handleCloseEditModal()
    } catch (error) {
      alert('保存失败：' + error.message)
    }
  }
  
  // 处理新建模板
  const handleCreateTemplate = () => {
    createTemplate({
      name: '新模板',
      description: '暂无描述',
      piece_tags: []
    })
  }
  
  // 处理导入模板
  const [showImportModal, setShowImportModal] = useState(false)
  
  const handleImportTemplate = () => {
    setShowImportModal(true)
  }
  
  const handleCloseImportModal = () => {
    setShowImportModal(false)
  }
  
  // 处理从JSON导入
  const [dragActive, setDragActive] = useState(false)
  
  const handleImportFromJson = () => {
    // 打开文件选择对话框
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = '.json'
    fileInput.onchange = (e) => {
      const file = e.target.files[0]
      if (file) {
        readJsonFile(file)
      }
    }
    fileInput.click()
  }
  
  // 读取JSON文件
  const readJsonFile = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const templateJson = JSON.parse(e.target.result)
        createTemplateFromJson(templateJson)
        setShowImportModal(false)
      } catch (error) {
        alert('JSON格式错误，请检查文件内容')
      }
    }
    reader.onerror = () => {
      alert('文件读取失败')
    }
    reader.readAsText(file)
  }
  
  // 拖拽事件处理
  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }
  
  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }
  
  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/json') {
      readJsonFile(file)
    } else if (file) {
      alert('请上传JSON文件')
    }
  }
  
  // 处理从项目棋子导入
  const handleImportFromProject = () => {
    // TODO: 实现从项目棋子导入逻辑
    alert('从项目棋子导入功能待实现')
    setShowImportModal(false)
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
            <div className="template-actions-buttons">
              <button 
                className="btn btn-primary"
                onClick={handleCreateTemplate}
              >
                新建模板
              </button>
              <button 
                className="btn btn-secondary"
                onClick={handleImportTemplate}
              >
                导入模板
              </button>
            </div>
          </div>
          
          {viewMode === 'card' ? (
            <div className="template-grid">
              {filteredTemplates.map(template => (
                <div key={template.id} className="template-card">
                  <div className="template-card-header">
                    <h3 className="template-name">{template.name}</h3>
                    <button 
                      className="edit-icon"
                      onClick={() => handleEditInfo(template)}
                      title="编辑信息"
                    >
                      ✏️
                    </button>
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
                        <span className="meta-value">{formatDateTime(template.created_at)}</span>
                      </div>
                      <div className="template-meta-item">
                        <span className="meta-label">修改时间：</span>
                        <span className="meta-value">{formatDateTime(template.edited_at)}</span>
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
                      <button 
                        className="btn btn-outline delete-btn"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        删除
                      </button>
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
                      <td>
                        <div className="template-title-with-edit">
                          <span>{template.name}</span>
                          <button 
                            className="edit-icon small"
                            onClick={() => handleEditInfo(template)}
                            title="编辑信息"
                          >
                            ✏️
                          </button>
                        </div>
                      </td>
                      <td>{template.description || '暂无描述'}</td>
                      <td>{template.id}</td>
                      <td>{formatDateTime(template.created_at)}</td>
                      <td>{formatDateTime(template.edited_at)}</td>
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
                          <button 
                            className="btn btn-outline small delete-btn"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            删除
                          </button>
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
      
      {/* 导入模板模态框 */}
      {showImportModal && (
        <div className="modal-overlay">
          <div 
            className={`modal-content ${dragActive ? 'drag-active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <h2>导入模板</h2>
            <p>请选择导入方式：</p>
            
            <div className="drag-drop-area">
              <p>或直接拖拽JSON文件到此处</p>
              <p className="drag-hint">支持 .json 文件</p>
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn btn-primary"
                onClick={handleImportFromJson}
              >
                从JSON文件导入
              </button>
              <button 
                className="btn btn-secondary"
                onClick={handleImportFromProject}
              >
                从项目棋子导入
              </button>
              <button 
                className="btn btn-outline"
                onClick={handleCloseImportModal}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 编辑模板模态框 */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content edit-modal">
            <h2>编辑模板</h2>
            
            <div className="edit-form">
              <div className="form-group">
                <label>模板名称 *</label>
                <input 
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="请输入模板名称"
                  maxLength="100"
                />
              </div>
              
              <div className="form-group">
                <label>描述</label>
                <textarea 
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="请输入模板描述"
                  rows="4"
                  maxLength="500"
                />
              </div>
              
              <div className="form-group">
                <label>标签</label>
                <input 
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="多个标签用英文逗号分隔"
                  maxLength="200"
                />
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn btn-primary"
                onClick={handleSaveEdit}
              >
                保存
              </button>
              <button 
                className="btn btn-outline"
                onClick={handleCloseEditModal}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default ExplorerTemplates