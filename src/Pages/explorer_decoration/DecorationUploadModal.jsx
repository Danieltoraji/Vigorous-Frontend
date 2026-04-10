import { useState, useEffect } from 'react'
import './DecorationUploadModal.css'

function DecorationUploadModal({ decoration, onClose, onUpdate, onUpload }) {
  const [formData, setFormData] = useState({
    name: '',
    decoration_tags: []
  })
  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [tagInput, setTagInput] = useState('')

  // 如果是编辑模式，填充现有数据
  useEffect(() => {
    if (decoration) {
      setFormData({
        name: decoration.name || '',
        decoration_tags: decoration.decoration_tags || []
      })
      if (decoration.file) {
        setFileName(decoration.file.split('/').pop())
      }
    }
  }, [decoration])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setFileName(selectedFile.name)
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
    if (tagInput.trim() && !formData.decoration_tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        decoration_tags: [...prev.decoration_tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      decoration_tags: prev.decoration_tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (decoration) {
        // 更新模式：仅提交可编辑字段，避免把 file URL / 只读字段提交到 PATCH。
        if (file) {
          const updateFormData = new FormData()
          updateFormData.append('name', formData.name)
          updateFormData.append('decoration_tags', JSON.stringify(formData.decoration_tags))
          updateFormData.append('file', file)
          await onUpdate(decoration.id, updateFormData)
        } else {
          await onUpdate(decoration.id, {
            name: formData.name,
            decoration_tags: formData.decoration_tags
          })
        }
      } else {
        // 上传模式
        const submitData = new FormData()
        submitData.append('name', formData.name)
        submitData.append('decoration_tags', JSON.stringify(formData.decoration_tags))
        if (file) {
          submitData.append('file', file)
        }
        await onUpload(submitData)
      }
    } catch (error) {
      console.error('提交失败:', error)
    }
  }

  return (
    <div className="upload-decoration-modal-overlay" onClick={onClose}>
      <div className="upload-decoration-modal-content" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="decoration-form">
          <div className="upload-decoration-modal-header">
            <h2>{decoration ? '编辑装饰' : '上传装饰'}</h2>
            <button className="decoration-close-button" onClick={onClose}>×</button>
          </div>

          <div className="decoration-form-group">
            <label>装饰名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="输入装饰名称"
              required
            />
          </div>

          <div className="decoration-form-group">
            <label>选择文件</label>
            <input
              type="file"
              accept=".stl,.obj"
              onChange={handleFileChange}
              required={!decoration}
            />
            <small>支持格式：STL, OBJ</small>
          </div>

          {fileName && (
            <div className="decoration-form-group">
              <label>已选文件</label>
              <div className="decoration-file-info-display">
                <span className="decoration-file-icon">📦</span>
                <span className="decoration-file-name">{fileName}</span>
              </div>
            </div>
          )}

          <div className="decoration-form-group">
            <label>标签</label>
            <div className="decoration-tag-input-container">
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
              <button type="button" onClick={handleAddTag} className="upload-decoration-modal-btn upload-decoration-modal-btn-secondary">
                添加
              </button>
            </div>
            <div className="decoration-tags-container">
              {formData.decoration_tags.map((tag, index) => (
                <span key={index} className="decoration-tag">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="decoration-remove-tag"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="decoration-form-actions">
            <button type="button" onClick={onClose} className="upload-decoration-modal-btn upload-decoration-modal-btn-secondary">
              取消
            </button>
            <button type="submit" className="upload-decoration-modal-btn upload-decoration-modal-btn-primary">
              {decoration ? '保存修改' : '上传'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DecorationUploadModal
