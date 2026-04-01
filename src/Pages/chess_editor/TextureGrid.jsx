import { useState, useEffect } from 'react'
import { useTexture } from '../../hooks/useTexture.jsx'
import './TextureGrid.css'

/**
 * 纹理网格选择器组件
 * @param {Function} onSelectTexture - 选择纹理时的回调
 * @param {Function} onClose - 关闭弹窗的回调
 * @param {string} mode - 模式：'selector' | 'generator'
 */
function TextureGrid({ onSelectTexture, onClose, mode = 'selector' }) {
  const { textureData, loading, error } = useTexture()
  const [textures, setTextures] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  // 从 context 获取纹理数据
  useEffect(() => {
    if (textureData) {
      const textureList = Object.values(textureData)
      console.log('TextureGrid 获取到的纹理:', textureList)
      setTextures(textureList)
    }
  }, [textureData])

  const handleSelect = (texture) => {
    setSelectedId(texture.id)
  }

  const handleConfirm = () => {
    const selected = textures.find(t => t.id === selectedId)
    if (selected) {
      onSelectTexture(selected)
      onClose()
    } else {
      alert('请先选择一个纹理')
    }
  }

  if (loading) {
    return (
      <div className="texture-grid-loading">
        <div className="texturegrid-loading-spinner"></div>
        <p>加载纹理中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="texture-grid-error">
        <p>⚠️ 加载失败：{error}</p>
      </div>
    )
  }

  return (
    <div className="texture-grid-container">
      {mode === 'generator' && (
        <div className="generator-hint">
          <p>💡 选择一个灰度图纹理，系统将把黑色映射为高度，白色高度为 0</p>
        </div>
      )}

      <div className="texturegrid-texture-grid">
        {textures.length === 0 ? (
          <div className="no-textures">
            <p>暂无纹理，请先到浮雕纹理资源管理器上传</p>
          </div>
        ) : (
          textures.map(texture => (
            <div
              key={texture.id}
              className={`texture-grid-item ${selectedId === texture.id ? 'selected' : ''}`}
              onClick={() => handleSelect(texture)}
            >
              <div className="texture-grid-preview">
                {texture.file ? (
                  <img src={texture.file} alt={texture.name} />
                ) : (
                  <div className="texturegrid-no-preview">无预览</div>
                )}
              </div>
              <div className="texture-grid-info">
                <p className="texture-grid-name">{texture.name}</p>
              </div>
              {selectedId === texture.id && (
                <div className="selected-badge">✓</div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="texture-grid-footer">
        <button
          className="texturegrid-btn-secondary"
          onClick={onClose}
        >
          取消
        </button>
        <button
          className="texturegrid-btn-primary"
          onClick={handleConfirm}
          disabled={!selectedId}
        >
          {mode === 'selector' ? '选择此纹理并生成' : '生成浮雕'}
        </button>
      </div>
    </div>
  )
}

export default TextureGrid
