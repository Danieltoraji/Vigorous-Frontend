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
    
    const submitData = new FormData()
    submitData.append('name', formData.name)
    submitData.append('decoration_tags', JSON.stringify(formData.decoration_tags))
    
    if (file) {
      submitData.append('file', file)
    }

    try {
      if (decoration) {
        // 更新模式
        await onUpdate({
          ...decoration,
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
          <h2>{decoration ? '编辑装饰' : '上传装饰'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="decoration-form">
          <div className="form-group">
            <label>装饰名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="输入装饰名称"
              required
            />
          </div>

          <div className="form-group">
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
            <div className="form-group">
              <label>已选文件</label>
              <div className="file-info-display">
                <span className="file-icon">📦</span>
                <span className="file-name">{fileName}</span>
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
              {formData.decoration_tags.map((tag, index) => (
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
              {decoration ? '保存修改' : '上传'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DecorationUploadModal
