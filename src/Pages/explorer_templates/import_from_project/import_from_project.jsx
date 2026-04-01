import { useState, useEffect } from 'react'
import { useProject } from '../../../hooks/useProject.jsx'
import { useChess } from '../../../hooks/useChess.jsx'
import './import_form_project.css'

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

function ImportFromProject({ isOpen, onClose, onConfirm }) {
  const { projectData, loading: projectLoading } = useProject()
  const { getPiecesByProject, getChessById, loading: chessLoading } = useChess()

  const [selectedProject, setSelectedProject] = useState(null)
  const [pieces, setPieces] = useState([])
  const [selectedPieces, setSelectedPieces] = useState([])
  const [loadingPieces, setLoadingPieces] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setSelectedProject(null)
      setPieces([])
      setSelectedPieces([])
    }
  }, [isOpen])

  const handleProjectClick = async (project) => {
    setSelectedProject(project)
    setSelectedPieces([])
    setLoadingPieces(true)
    try {
      const piecesData = await getPiecesByProject(project.id)
      setPieces(piecesData || [])
    } catch (error) {
      console.error('获取棋子失败:', error)
      setPieces([])
    } finally {
      setLoadingPieces(false)
    }
  }

  const handleBackToProjects = () => {
    setSelectedProject(null)
    setPieces([])
    setSelectedPieces([])
  }

  const handlePieceSelect = (piece) => {
    setSelectedPieces(prev => {
      const isSelected = prev.some(p => p.id === piece.id)
      if (isSelected) {
        return prev.filter(p => p.id !== piece.id)
      } else {
        return [...prev, piece]
      }
    })
  }

  const handleConfirm = async () => {
    if (selectedPieces.length === 0) {
      alert('请至少选择一个棋子')
      return
    }

    try {
      // 使用 getChessById 获取每个选中棋子的完整数据
      const completePieces = []
      for (const piece of selectedPieces) {
        const completePiece = await getChessById(piece.id)
        completePieces.push(completePiece)
      }

      console.log(completePieces)
      onConfirm(completePieces)
      onClose()
    } catch (error) {
      console.error('获取棋子完整数据失败:', error)
      alert('获取棋子数据失败，请重试')
    }
  }

  if (!isOpen) return null

  const projects = Object.values(projectData || {})

  return (
    <div className="import-modal-overlay">
      <div className="import-modal-content">
        <div className="import-modal-header">
          {selectedProject ? (
            <>
              <button className="import-form-project-btn import-form-project-btn-secondary back-btn" onClick={handleBackToProjects}>
                ← 返回项目列表
              </button>
              <h2>选择棋子 - {selectedProject.name}</h2>
            </>
          ) : (
            <h2>选择项目</h2>
          )}
          <button className="import-form-project-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="import-modal-body">
          {projectLoading ? (
            <div className="loading-container">加载中...</div>
          ) : selectedProject ? (
            <>
              {loadingPieces ? (
                <div className="loading-container">加载棋子中...</div>
              ) : pieces.length === 0 ? (
                <div className="empty-container">该项目暂无棋子</div>
              ) : (
                <div className="pieces-grid">
                  {pieces.map(piece => (
                    <div
                      key={piece.id}
                      className={`piece-card ${selectedPieces.some(p => p.id === piece.id) ? 'selected' : ''}`}
                      onClick={() => handlePieceSelect(piece)}
                    >
                      <div className="piece-card-header">
                        <h3 className="piece-name">{piece.name || '未命名棋子'}</h3>
                        <div className={`checkbox ${selectedPieces.some(p => p.id === piece.id) ? 'checked' : ''}`}>
                          {selectedPieces.some(p => p.id === piece.id) && '✓'}
                        </div>
                      </div>
                      <div className="piece-card-body">
                        <div className="piece-meta">
                          <div className="piece-meta-item">
                            <span className="import-form-project-meta-label">ID：</span>
                            <span className="import-form-project-meta-value">{piece.id}</span>
                          </div>
                          <div className="piece-meta-item">
                            <span className="import-form-project-meta-label">创建时间：</span>
                            <span className="import-form-project-meta-value">{formatDateTime(piece.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : projects.length === 0 ? (
            <div className="empty-container">暂无项目</div>
          ) : (
            <div className="projects-grid">
              {projects.map(project => (
                <div
                  key={project.id}
                  className="project-card"
                  onClick={() => handleProjectClick(project)}
                >
                  <div className="project-card-header">
                    <h3 className="import-form-project-project-name">{project.name || '未命名项目'}</h3>
                  </div>
                  <div className="project-card-body">
                    <p className="import-form-project-project-description">
                      {project.description || '暂无描述'}
                    </p>
                    <div className="import-form-project-project-meta">
                      <div className="import-form-project-project-meta-item">
                        <span className="import-form-project-meta-label">ID：</span>
                        <span className="import-form-project-meta-value">{project.id}</span>
                      </div>
                      <div className="import-form-project-project-meta-item">
                        <span className="import-form-project-meta-label">创建时间：</span>
                        <span className="import-form-project-meta-value">{formatDateTime(project.created_at)}</span>
                      </div>
                    </div>
                    {project.project_tags && project.project_tags.length > 0 && (
                      <div className="import-form-project-project-tags">
                        {project.project_tags.map((tag, index) => (
                          <span key={index} className="import-form-project-project-tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="project-card-footer">
                    <span className="click-hint">点击查看棋子 →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="import-form-project-import-modal-footer">
          {selectedProject && (
            <div className="selected-count">
              已选择 {selectedPieces.length} 个棋子
            </div>
          )}
          <div className="import-form-project-modal-actions">
            <button className="import-form-project-btn import-form-project-btn-outline" onClick={onClose}>
              取消
            </button>
            {selectedProject && (
              <button
                className="import-form-project-btn import-form-project-btn-primary"
                onClick={handleConfirm}
                disabled={selectedPieces.length === 0}
              >
                确定导入
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImportFromProject
