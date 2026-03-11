/**
 * 装饰资源管理器
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../hooks/useUser.jsx'
import { useDecoration } from '../../hooks/useDecoration.jsx'
import DecorationList from './DecorationList.jsx'
import DecorationUploadModal from './DecorationUploadModal.jsx'
import ExplorerBottom from '../explorer_project/ExplorerBottom.jsx'
import './explorer_decoration.css'

function ExplorerDecoration() {
  const navigate = useNavigate()
  const { userData, loading } = useUser()
  const { decorationData, setDecorationData, updateDecoration, deleteDecoration, uploadDecoration } = useDecoration()
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [currentDecoration, setCurrentDecoration] = useState(null)

  const onBack = () => {
    navigate('/menu')
  }

  if (loading || !userData) {
    console.log('正在加载用户信息...')
    return <div className="loading-container">正在加载用户信息...</div>
  }

  // 从 DecorationContext 获取装饰数据
  /** @type {Decoration[]} */
  const decorations = Object.values(decorationData || {}).map(decoration => {
    console.log('获取了一个装饰：', decoration.id, decoration.name)
    return decoration || {
      id: 1,
      name: '未知装饰',
      user: '未知',
      created_at: '无数据',
      edited_at: '无数据',
      file: null,
      decoration_tags: []
    }
  })

  const handleEditDecoration = (decoration) => {
    setCurrentDecoration(decoration)
    setIsUploadModalOpen(true)
  }

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false)
    setCurrentDecoration(null)
  }

  const handleUpdateDecoration = async (updatedDecoration) => {
    try {
      await updateDecoration(updatedDecoration.id, updatedDecoration)
      setIsUploadModalOpen(false)
      setCurrentDecoration(null)
    } catch (error) {
      alert('更新失败，请重试')
    }
  }

  const handleUploadDecoration = async (formData) => {
    try {
      await uploadDecoration(formData)
      setIsUploadModalOpen(false)
    } catch (error) {
      alert('上传失败，请重试')
    }
  }

  return (
    <div className="explorer-decoration">
      <div className="explorer-header">
        <button className="back-button" onClick={onBack}>
          ← 返回
        </button>
        <h1>装饰资源管理器</h1>
        <p>欢迎您！{userData.username}</p>
      </div>

      <DecorationList
        decorations={decorations}
        onEditDecoration={handleEditDecoration}
        onDeleteDecoration={deleteDecoration}
        onUploadDecoration={() => setIsUploadModalOpen(true)}
      />

      {isUploadModalOpen && (
        <DecorationUploadModal
          decoration={currentDecoration}
          onClose={handleCloseUploadModal}
          onUpdate={handleUpdateDecoration}
          onUpload={handleUploadDecoration}
        />
      )}

      <ExplorerBottom />
    </div>
  )
}

export default ExplorerDecoration
