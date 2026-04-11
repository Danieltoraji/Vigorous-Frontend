import { useEffect, useRef, useState } from 'react'
import { useUser } from '../../hooks/useUser.jsx'
import { useTemplates } from '../../hooks/useTemplates.jsx'
import { useProject } from '../../hooks/useProject.jsx'
import './explorer_templates.css'
import { useNavigate } from 'react-router-dom'
import ImportFromProject from './import_from_project/import_from_project.jsx'
import { ApplyTemplateModal } from './modals/ApplyTemplateModal.jsx'

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
  const { templatesData, loading, error, deleteTemplate, createTemplate, createTemplateFromJson, updateTemplate, applyPresetToProjects } = useTemplates()
  const { projectData } = useProject()
  const [viewMode, setViewMode] = useState('card') // 'card' or 'list'
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [visibilityFilter, setVisibilityFilter] = useState('all') // 'all' | 'mine' | 'public'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTagInput, setEditTagInput] = useState('')
  const [editTagList, setEditTagList] = useState([])
  const { userData } = useUser()
  const [moreActionsOpen, setMoreActionsOpen] = useState(null)
  const moreActionsRefs = useRef({})
  const sidebarRef = useRef(null)
  const navigate = useNavigate()
  const [applyingTemplateId, setApplyingTemplateId] = useState(null)

  useEffect(() => {
    if (moreActionsOpen === null) return undefined

    const handleClickOutside = (event) => {
      const activeMenu = moreActionsRefs.current[moreActionsOpen]
      if (activeMenu && !activeMenu.contains(event.target)) {
        setMoreActionsOpen(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [moreActionsOpen])

  useEffect(() => {
    if (!sidebarOpen) return undefined

    const handleSidebarClickOutside = (event) => {
      if (window.innerWidth <= 768) {
        return
      }

      const clickedInsideSidebar = sidebarRef.current && sidebarRef.current.contains(event.target)

      if (!clickedInsideSidebar) {
        setSidebarOpen(false)
      }
    }

    document.addEventListener('mousedown', handleSidebarClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleSidebarClickOutside)
    }
  }, [sidebarOpen])

  const onBack = () => {
    navigate('/menu')
  }

  const handleSidebarBackgroundToggle = () => {
    if (window.innerWidth <= 768) {
      return
    }
    setSidebarOpen(prev => !prev)
  }

  // 提取所有标签
  const allTags = new Set()
  Object.values(templatesData).forEach(template => {
    if (template.piece_tags) {
      template.piece_tags.forEach(tag => allTags.add(tag))
    }
  })

  // 过滤模板并按id降序排序
  const currentUserId = userData?.id
  const isOwnedByCurrentUser = (template) => String(template?.user) === String(currentUserId)
  const mineCount = Object.values(templatesData).filter(template => template.user === currentUserId).length
  const publicCount = Object.values(templatesData).filter(template => template.is_public).length

  const filteredTemplates = Object.values(templatesData).filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTag = !selectedTag || (template.piece_tags && template.piece_tags.includes(selectedTag))
    const matchesVisibility =
      visibilityFilter === 'all'
        ? true
        : visibilityFilter === 'mine'
          ? template.user === currentUserId
          : template.is_public

    return matchesSearch && matchesTag && matchesVisibility
  }).sort((a, b) => b.id - a.id)

  // 处理更多操作菜单
  const toggleMoreActions = (templateId) => {
    setMoreActionsOpen(moreActionsOpen === templateId ? null : templateId)
  }
  // 处理删除模板
  const handleDeleteTemplate = async (template) => {
    if (template?.is_public && !isOwnedByCurrentUser(template)) {
      alert('无权限：公有棋子仅作者可编辑或删除')
      return
    }

    if (window.confirm('确定要删除这个模板吗？')) {
      try {
        await deleteTemplate(template.id)
        alert('删除成功')
      } catch (error) {
        const message = error?.response?.data?.error || error?.response?.data?.detail || error?.message || '删除失败，请重试'
        alert(message)
      }
    }
  }

  // 处理打开模板
  const handleOpenTemplate = (template) => {
    navigate(`/template-editor/${template.id}`)
  }

  // 处理应用到项目
  const handleApplyToProject = (template) => {
    setApplyingTemplateId(template.id);
  }

  // 处理应用模板成功
  const handleApplySuccess = (result) => {
    setApplyingTemplateId(null);
    const createdCount = result?.createdPieces?.length || 0
    const failedCount = result?.failedProjects?.length || 0
    const createdProjectName = result?.createdProject?.name

    if (createdProjectName) {
      alert(`应用成功：已创建项目“${createdProjectName}”，并生成 ${createdCount} 个棋子。请前往我的项目刷新页面。`)
      return
    }

    if (failedCount > 0) {
      alert(`应用完成：成功 ${createdCount} 个，失败 ${failedCount} 个。请前往我的项目刷新页面。`)
      return
    }

    alert(`应用成功：已生成 ${createdCount} 个棋子。请前往我的项目刷新页面。`)
  }

  // 处理编辑信息
  const handleEditInfo = (template) => {
    if (template?.is_public && !isOwnedByCurrentUser(template)) {
      alert('无权限：公有棋子仅作者可编辑或删除')
      return
    }

    setEditingTemplate(template)
    setEditName(template.name || '')
    setEditDescription(template.description || '')
    setEditTagList(Array.isArray(template.piece_tags) ? [...template.piece_tags] : [])
    setEditTagInput('')
    setShowEditModal(true)
  }

  // 处理关闭编辑模态框
  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditingTemplate(null)
    setEditName('')
    setEditDescription('')
    setEditTagInput('')
    setEditTagList([])
  }

  // 处理保存编辑
  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      alert('模板名称不能为空')
      return
    }

    try {
      await updateTemplate(editingTemplate.id, {
        name: editName,
        description: editDescription,
        piece_tags: editTagList
      })
      alert('保存成功')
      handleCloseEditModal()
    } catch (error) {
      const message = error?.response?.data?.error || error?.response?.data?.detail || error?.message || '保存失败，请重试'
      alert('保存失败：' + message)
    }
  }

  const handleAddEditTag = () => {
    const normalizedTag = editTagInput.trim()
    if (!normalizedTag || editTagList.includes(normalizedTag)) return

    setEditTagList(prev => [...prev, normalizedTag])
    setEditTagInput('')
  }

  const handleRemoveEditTag = (tagToRemove) => {
    setEditTagList(prev => prev.filter(tag => tag !== tagToRemove))
  }

  const handleEditTagInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleAddEditTag()
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
        alert('导入成功')
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
      alert(`导入成功：${successCount} 个${failCount > 0 ? `，失败 ${failCount} 个` : ''}`)
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
      <div className="explorer-header">
        {/* <button className="back-button" onClick={onBack}>
          ← 返回
        </button> */}
        <h1 className='header-title' onClick={onBack}>
          ❮  模板资源管理器</h1>
        <p className='user-welcome'>欢迎您！{userData.username}</p>
      </div>

      <div className={`explorer-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
        <div
          ref={sidebarRef}
          className={`left-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}
          onClick={handleSidebarBackgroundToggle}
        >
          <div className="left-sidebar-content" onClick={(event) => event.stopPropagation()}>
            <div className="filter-section">
              <h2>可见性筛选</h2>
              <div className="tag-filters">
                <button
                  className={`tag-filter ${visibilityFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setVisibilityFilter('all')}
                >
                  全部（{Object.keys(templatesData).length}）
                </button>
                <button
                  className={`tag-filter ${visibilityFilter === 'mine' ? 'active' : ''}`}
                  onClick={() => setVisibilityFilter('mine')}
                >
                  仅我的（{mineCount}）
                </button>
                <button
                  className={`tag-filter ${visibilityFilter === 'public' ? 'active' : ''}`}
                  onClick={() => setVisibilityFilter('public')}
                >
                  仅公开（{publicCount}）
                </button>
              </div>
            </div>

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
                  </div>

                  <div className="template-card-body">
                    <p className="template-description">
                      {template.description || '暂无描述'}
                    </p>

                    <div className="template-meta">
                      <div className="template-meta-item">
                        <span className="meta-label">可见性：</span>
                        <span className={`visibility-badge ${template.is_public ? 'visibility-public' : 'visibility-private'}`}>
                          {template.is_public ? '公开' : '私有'}
                        </span>
                      </div>
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
                      <div
                        className="more-actions"
                        ref={(node) => {
                          if (node) {
                            moreActionsRefs.current[template.id] = node
                          }
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-outline small more-actions-toggle"
                          onClick={() => toggleMoreActions(template.id)}
                          title="更多操作"
                          aria-label="更多操作"
                        >
                          ...
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
                              onClick={() => handleDeleteTemplate(template)}
                            >
                              删除
                            </button>
                          </div>
                        )}
                      </div>
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
                    <th>可见性</th>
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
                        </div>
                      </td>
                      <td>{template.description || '暂无描述'}</td>
                      <td>{template.id}</td>
                      <td>{formatDateTime(template.created_at)}</td>
                      <td>{formatDateTime(template.edited_at)}</td>
                      <td>
                        <span className={`visibility-badge ${template.is_public ? 'visibility-public' : 'visibility-private'}`}>
                          {template.is_public ? '公开' : '私有'}
                        </span>
                      </td>
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
                          <div
                            className="more-actions"
                            ref={(node) => {
                              if (node) {
                                moreActionsRefs.current[template.id] = node
                              }
                            }}
                          >
                            <button
                              type="button"
                              className="btn btn-outline small more-actions-toggle"
                              onClick={() => toggleMoreActions(template.id)}
                              title="更多操作"
                              aria-label="更多操作"
                            >
                              ...
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
                                  onClick={() => handleDeleteTemplate(template)}
                                >
                                  删除
                                </button>
                              </div>
                            )}
                          </div>
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
            className={`modal-content import-modal-two-column ${dragActive ? 'drag-active' : ''}`}
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
                  className="btn btn-primary import-column-btn"
                  onClick={handleImportFromJson}
                >
                  选择JSON文件...
                </button>
              </div>

              <div className="import-column">
                <h3 className="import-column-title">从项目导入</h3>
                <p className="import-column-desc">从现有项目中导入棋子作为模板，可以选择项目中的多个棋子批量导入。</p>
                <button
                  className="btn btn-primary import-column-btn large"
                  onClick={handleImportFromProject}
                >
                  选择项目中的棋子...
                </button>
              </div>
            </div>

            <div className="import-modal-footer">
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
        <div className="modal-overlay template-edit-overlay" onClick={handleCloseEditModal}>
          <div className="template-edit-modal-content" onClick={(e) => e.stopPropagation()}>
            <form
              className="template-edit-form"
              onSubmit={(e) => {
                e.preventDefault()
                handleSaveEdit()
              }}
            >
              <div className="template-edit-modal-header">
                <h2>模板信息编辑</h2>
                <button
                  type="button"
                  className="template-edit-close"
                  onClick={handleCloseEditModal}
                >
                  ×
                </button>
              </div>

              <div className="template-edit-form-group">
                <label htmlFor="template-edit-name">模板名称 *</label>
                <input
                  id="template-edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="请输入模板名称"
                  maxLength="100"
                  required
                />
              </div>

              <div className="template-edit-form-group">
                <label htmlFor="template-edit-description">描述</label>
                <textarea
                  id="template-edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="请输入模板描述"
                  rows="4"
                  maxLength="500"
                />
              </div>

              <div className="template-edit-form-group">
                <label htmlFor="template-edit-tag-input">标签</label>
                <div className="template-edit-tag-input-container">
                  <input
                    id="template-edit-tag-input"
                    type="text"
                    value={editTagInput}
                    onChange={(e) => setEditTagInput(e.target.value)}
                    onKeyDown={handleEditTagInputKeyDown}
                    placeholder="输入标签后按回车"
                    maxLength="50"
                  />
                  <button
                    type="button"
                    className="template-modal-btn template-modal-btn-secondary"
                    onClick={handleAddEditTag}
                  >
                    添加
                  </button>
                </div>
                <div className="template-edit-tags-container">
                  {editTagList.map((tag, index) => (
                    <span key={`${tag}-${index}`} className="template-edit-tag-chip">
                      {tag}
                      <button
                        type="button"
                        className="template-remove-tag"
                        onClick={() => handleRemoveEditTag(tag)}
                        aria-label={`删除标签 ${tag}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="template-edit-modal-footer">
                <button type="button" className="template-modal-btn template-modal-btn-secondary" onClick={handleCloseEditModal}>
                  取消
                </button>
                <button type="submit" className="template-modal-btn template-modal-btn-primary">
                  保存修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 从项目棋子导入模态框 */}
      <ImportFromProject
        isOpen={showImportFromProjectModal}
        onClose={handleCloseImportFromProjectModal}
        onConfirm={handleConfirmImportFromProject}
      />

      {/* 应用模板到项目模态框 */}
      {applyingTemplateId && (
        <ApplyTemplateModal
          isOpen={!!applyingTemplateId}
          onClose={() => setApplyingTemplateId(null)}
          presetId={applyingTemplateId}
          presetName={templatesData[applyingTemplateId]?.name || ''}
          projects={projectData}
          onApplySuccess={handleApplySuccess}
          onApply={applyPresetToProjects}
        />
      )}

    </div>
  )
}
export default ExplorerTemplates