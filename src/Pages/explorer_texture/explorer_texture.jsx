/**
 * 纹理资源管理器
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../hooks/useUser.jsx'
import { useTexture } from '../../hooks/useTexture.jsx'
import csrfapi from '../../utils/csrfapi.js'
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

  const handleUpdateTexture = async (formData) => {
    try {
      console.log('开始更新纹理:', currentTexture?.id)
      // 如果是 FormData 对象，需要从中提取数据
      if (formData instanceof FormData) {
        // 从当前纹理获取 ID
        const textureId = currentTexture.id;
        console.log('使用 FormData 更新纹理 ID:', textureId)
        
        // 使用 csrfapi 发送 PATCH 请求（自动携带认证信息）
        // 注意：axios 处理 FormData 时会自动设置正确的 Content-Type（包括 boundary）
        const response = await csrfapi.patch(`/textures/${textureId}/`, formData);
        
        console.log('响应状态:', response.status)
        console.log('更新成功，返回数据:', response.data)
        
        // 更新本地状态
        setTextureData(prev => ({
          ...prev,
          [textureId]: response.data
        }));
      } else {
        // 如果是普通对象（向后兼容）
        await updateTexture(formData.id, formData);
      }
      
      setIsUploadModalOpen(false)
      setCurrentTexture(null)
    } catch (error) {
      console.error('更新失败:', error)
      console.error('错误响应:', error.response)
      console.error('错误数据:', error.response?.data)
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
        {/* <button className="back-button" onClick={onBack}>
          ← 返回
        </button> */}
        <h1 className='header-title'>浮雕纹理资源管理器</h1>
        <p className='user-welcome'>欢迎您！{userData.username}</p>
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
