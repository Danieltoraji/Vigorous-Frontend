import { useState } from 'react'
import { useUser } from '../../hooks/useUser.jsx'
import { useTemplates } from '../../hooks/useTemplates.jsx'
import './explorer_templates.css'
import { useNavigate } from 'react-router-dom'
import ExplorerBottom from '../explorer_project/ExplorerBottom.jsx'
import ImportFromProject from './import_from_project/import_from_project.jsx'

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
  const { userData } = useUser()
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

  // 过滤模板并按id降序排序
  const filteredTemplates = Object.values(templatesData).filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTag = !selectedTag || (template.piece_tags && template.piece_tags.includes(selectedTag))
    return matchesSearch && matchesTag
  }).sort((a, b) => b.id - a.id)

  // 处理更多操作菜单
  const toggleMoreActions = (templateId) => {
    setMoreActionsOpen(moreActionsOpen === templateId ? null : templateId)
  }
  // 处理删除模板
  const handleDeleteTemplate = (templateId) => {
    if (window.confirm('确定要删除这个模板吗？')) {
      deleteTemplate(templateId)
    }
  }

  // 处理打开模板
  const handleOpenTemplate = (template) => {
    navigate(`/template-editor/${template.id}`)
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
    reader.onload = async (e) => {
      try {
        const templateJson = JSON.parse(e.target.result)
        await createTemplateFromJson(templateJson)
        alert('模板导入成功！')
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
  const [showImportFromProjectModal, setShowImportFromProjectModal] = useState(false)

  const handleImportFromProject = () => {
    setShowImportFromProjectModal(true)
    setShowImportModal(false)
  }

  const handleCloseImportFromProjectModal = () => {
    setShowImportFromProjectModal(false)
  }

  const handleConfirmImportFromProject = async (selectedPieces) => {
    if (!selectedPieces || selectedPieces.length === 0) {
      return
    }

    let successCount = 0
    let failCount = 0

    for (const piece of selectedPieces) {
      try {
        await createTemplateFromJson(piece)
        successCount++
      } catch (error) {
        console.error('创建模板失败:', error)
        failCount++
      }
    }

    if (successCount > 0) {
      alert(`成功导入 ${successCount} 个模板${failCount > 0 ? `，${failCount} 个失败` : ''}`)
    } else {
      alert('导入失败，请重试')
    }
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
      <div className="explorer-templates-explorer-header">
        {/* <button className="back-button" onClick={onBack}>
          ← 返回
        </button> */}
        <h1 className='explorer-templates-header-title' onClick={onBack}>
          ❮  模板资源管理器</h1>
        <p className='explorer-templates-user-welcome'>欢迎您！{userData.username}</p>
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
          <div className="explorer-templates-view-controls">
            <div className="view-buttons">
              <button
                className={`explorer-templates-view-button ${viewMode === 'card' ? 'active' : ''}`}
                onClick={() => setViewMode('card')}
              >
                卡片视图
              </button>
              <button
                className={`explorer-templates-view-button ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                列表视图
              </button>
            </div>
            <div className="template-actions-buttons">
              <button
                className="explorer-templates-btn explorer-templates-btn-primary"
                onClick={handleCreateTemplate}
              >
                新建模板
              </button>
              <button
                className="explorer-templates-btn explorer-templates-btn-secondary"
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
                    <h3 className="explorer-templates-template-name">{template.name}</h3>
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
                        <span className="explorer-templates-meta-label">ID：</span>
                        <span className="explorer-templates-meta-value">{template.id}</span>
                      </div>
                      <div className="template-meta-item">
                        <span className="explorer-templates-meta-label">创建时间：</span>
                        <span className="explorer-templates-meta-value">{formatDateTime(template.created_at)}</span>
                      </div>
                      <div className="template-meta-item">
                        <span className="explorer-templates-meta-label">修改时间：</span>
                        <span className="explorer-templates-meta-value">{formatDateTime(template.edited_at)}</span>
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
                        className="explorer-templates-btn explorer-templates-btn-secondary"
                        onClick={() => handleOpenTemplate(template)}
                      >
                        打开
                      </button>
                      <button
                        className="explorer-templates-btn explorer-templates-btn-primary"
                        onClick={() => handleApplyToProject(template)}
                      >
                        应用到项目
                      </button>
                      <button
                        className="explorer-templates-btn btn-outline delete-btn"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        删除
                      </button>
                      <div className="more-actions">
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
                            className="explorer-templates-btn explorer-templates-btn-secondary small"
                            onClick={() => handleOpenTemplate(template)}
                          >
                            打开
                          </button>
                          <button
                            className="explorer-templates-btn explorer-templates-btn-primary small"
                            onClick={() => handleApplyToProject(template)}
                          >
                            应用
                          </button>
                          <div className="more-actions">
                            <button
                              className="explorer-templates-btn btn-outline small"
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

      {/* 导入模板模态框 */}
      {showImportModal && (
        <div className="explorer-templates-modal-overlay">
          <div
            className={`explorer-templates-modal-content import-modal-two-column ${dragActive ? 'drag-active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <h2 className="import-modal-title">导入模板</h2>

            <div className="import-columns">
              <div className="import-column">
                <h3 className="import-column-title">从JSON导入</h3>
                <div className="drag-drop-area">
                  <p>拖拽JSON文件到此处</p>
                  <p className="drag-hint">支持 .json 文件</p>
                </div>
                <button
                  className="explorer-templates-btn explorer-templates-btn-primary import-column-btn"
                  onClick={handleImportFromJson}
                >
                  从JSON文件导入
                </button>
              </div>

              <div className="import-column">
                <h3 className="import-column-title">从项目导入</h3>
                <p className="import-column-desc">从现有项目中导入棋子作为模板，可以选择项目中的多个棋子批量导入。</p>
                <button
                  className="explorer-templates-btn explorer-templates-btn-primary import-column-btn large"
                  onClick={handleImportFromProject}
                >
                  从项目棋子导入
                </button>
              </div>
            </div>

            <div className="explorer-templates-import-modal-footer">
              <button
                className="explorer-templates-btn btn-outline"
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
        <div className="explorer-templates-modal-overlay">
          <div className="explorer-templates-modal-content edit-modal">
            <h2>编辑模板</h2>

            <div className="edit-form">
              <div className="explorer-templates-form-group">
                <label>模板名称 *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="请输入模板名称"
                  maxLength="100"
                />
              </div>

              <div className="explorer-templates-form-group">
                <label>描述</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="请输入模板描述"
                  rows="4"
                  maxLength="500"
                />
              </div>

              <div className="explorer-templates-form-group">
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

            <div className="explorer-templates-modal-actions">
              <button
                className="explorer-templates-btn explorer-templates-btn-primary"
                onClick={handleSaveEdit}
              >
                保存
              </button>
              <button
                className="explorer-templates-btn btn-outline"
                onClick={handleCloseEditModal}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 从项目棋子导入模态框 */}
      <ImportFromProject
        isOpen={showImportFromProjectModal}
        onClose={handleCloseImportFromProjectModal}
        onConfirm={handleConfirmImportFromProject}
      />

      <ExplorerBottom />
    </div>
  )
}
export default ExplorerTemplates