import { useState, useEffect } from 'react'
import './TextureUploadModal.css'

function TextureUploadModal({ texture, onClose, onUpdate, onUpload }) {
  const [formData, setFormData] = useState({
    name: '',
    texture_tags: []
  })
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [tagInput, setTagInput] = useState('')

  // 如果是编辑模式，填充现有数据
  useEffect(() => {
    if (texture) {
      setFormData({
        name: texture.name || '',
        texture_tags: texture.texture_tags || []
      })
    }
  }, [texture])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      // 创建预览 URL
      const url = URL.createObjectURL(selectedFile)
      setPreviewUrl(url)
      // 如果没有设置名称，使用文件名
      if (!formData.name) {
        setFormData(prev => ({
          ...prev,
          name: selectedFile.name.split('.')[0]
        }))
      }
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.texture_tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        texture_tags: [...prev.texture_tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      texture_tags: prev.texture_tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const submitData = new FormData()
    submitData.append('name', formData.name)
    submitData.append('texture_tags', JSON.stringify(formData.texture_tags))
    
    if (file) {
      submitData.append('file', file)
    }

    try {
      if (texture) {
        // 更新模式
        await onUpdate({
          ...texture,
          ...formData
        })
      } else {
        // 上传模式
        await onUpload(submitData)
      }
    } catch (error) {
      console.error('提交失败:', error)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{texture ? '编辑纹理' : '上传纹理'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="texture-form">
          <div className="form-group">
            <label>纹理名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="输入纹理名称"
              required
            />
          </div>

          <div className="form-group">
            <label>选择文件</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              required={!texture}
            />
            <small>支持格式：PNG, JPG, JPEG, WEBP</small>
          </div>

          {previewUrl && (
            <div className="form-group">
              <label>预览</label>
              <div className="preview-container">
                <img src={previewUrl} alt="预览" className="preview-image" />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>标签</label>
            <div className="tag-input-container">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="输入标签后按回车"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
              />
              <button type="button" onClick={handleAddTag} className="btn btn-secondary">
                添加
              </button>
            </div>
            <div className="tags-container">
              {formData.texture_tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="remove-tag"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              {texture ? '保存修改' : '上传'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TextureUploadModal
