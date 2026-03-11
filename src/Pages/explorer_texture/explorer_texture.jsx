/**
 * 纹理资源管理器
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../hooks/useUser.jsx'
import { useTexture } from '../../hooks/useTexture.jsx'
import TextureList from './TextureList.jsx'
import TextureUploadModal from './TextureUploadModal.jsx'
import ExplorerBottom from '../explorer_project/ExplorerBottom.jsx'
import './explorer_texture.css'

function ExplorerTexture() {
  const navigate = useNavigate()
  const { userData, loading } = useUser()
  const { textureData, setTextureData, updateTexture, deleteTexture, uploadTexture } = useTexture()
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [currentTexture, setCurrentTexture] = useState(null)

  const onBack = () => {
    navigate('/menu')
  }

  if (loading || !userData) {
    console.log('正在加载用户信息...')
    return <div className="loading-container">正在加载用户信息...</div>
  }

  // 从 TextureContext 获取纹理数据
  /** @type {Texture[]} */
  const textures = Object.values(textureData || {}).map(texture => {
    console.log('获取了一个纹理：', texture.id, texture.name)
    return texture || {
      id: 1,
      name: '未知纹理',
      user: '未知',
      created_at: '无数据',
      edited_at: '无数据',
      file: null,
      texture_tags: []
    }
  })

  const handleEditTexture = (texture) => {
    setCurrentTexture(texture)
    setIsUploadModalOpen(true)
  }

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false)
    setCurrentTexture(null)
  }

  const handleUpdateTexture = async (updatedTexture) => {
    try {
      await updateTexture(updatedTexture.id, updatedTexture)
      setIsUploadModalOpen(false)
      setCurrentTexture(null)
    } catch (error) {
      alert('更新失败，请重试')
    }
  }

  const handleUploadTexture = async (formData) => {
    try {
      await uploadTexture(formData)
      setIsUploadModalOpen(false)
    } catch (error) {
      alert('上传失败，请重试')
    }
  }

  return (
    <div className="explorer-texture">
      <div className="explorer-header">
        <button className="back-button" onClick={onBack}>
          ← 返回
        </button>
        <h1>纹理资源管理器</h1>
        <p>欢迎您！{userData.username}</p>
      </div>

      <TextureList
        textures={textures}
        onEditTexture={handleEditTexture}
        onDeleteTexture={deleteTexture}
        onUploadTexture={() => setIsUploadModalOpen(true)}
      />

      {isUploadModalOpen && (
        <TextureUploadModal
          texture={currentTexture}
          onClose={handleCloseUploadModal}
          onUpdate={handleUpdateTexture}
          onUpload={handleUploadTexture}
        />
      )}

      <ExplorerBottom />
    </div>
  )
}

export default ExplorerTexture
