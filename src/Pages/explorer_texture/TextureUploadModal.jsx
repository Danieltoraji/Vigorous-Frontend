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

  // 如果是编辑模式，填充现有数据并显示预览
  useEffect(() => {
    if (texture) {
      setFormData({
        name: texture.name || '',
        texture_tags: texture.texture_tags || []
      })
      // 如果有文件，设置预览和 file 状态
      if (texture.file) {
        setPreviewUrl(texture.file)
        // 注意：编辑模式下，file 初始为 null，只有用户选择新文件时才会设置
        // 这样提交时如果不选择新文件，就不会包含 file 字段
      }
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

  // 将图片转换为灰度图并反色
  const convertToGrayscale = async () => {
    if (!previewUrl) {
      console.error('没有预览图，无法处理')
      alert('请先选择图片')
      return
    }

    console.log('开始处理图片，previewUrl:', previewUrl)
    console.log('当前 file 对象:', file)

    try {
      // 如果是编辑模式且 file 为 null，需要先加载预览图
      let imageToProcess = previewUrl
      
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = previewUrl
      
      await new Promise((resolve, reject) => {
        img.onload = () => {
          console.log('图片加载成功，尺寸:', img.width, 'x', img.height)
          resolve()
        }
        img.onerror = (error) => {
          console.error('图片加载失败:', error)
          reject(error)
        }
      })
      
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      
      // 绘制原图
      ctx.drawImage(img, 0, 0)
      
      // 获取像素数据
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      console.log('成功获取像素数据，开始处理...')
      
      // 转换为灰度并反色
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        // 使用加权平均法：0.299R + 0.587G + 0.114B
        const gray = 0.299 * r + 0.587 * g + 0.114 * b
        // 反色：255 - 灰度值
        const inverted = 255 - gray
        data[i] = inverted     // R
        data[i + 1] = inverted // G
        data[i + 2] = inverted // B
      }
      
      // 放回画布
      ctx.putImageData(imageData, 0, 0)
      
      // 生成处理后的 Blob
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Blob 生成失败')
          alert('图片处理失败，请重试')
          return
        }
        
        console.log('成功生成 Blob:', blob.size, 'bytes, type:', blob.type)
        
        // 创建新的 File 对象（编辑模式下 file 可能为 null）
        const fileName = file?.name || `processed_${Date.now()}.png`
        const processedFile = new File([blob], fileName, { 
          type: blob.type 
        })
        setFile(processedFile)
        
        // 更新预览为处理后的图片
        const processedUrl = URL.createObjectURL(blob)
        setPreviewUrl(processedUrl)
        
        console.log('图片处理完成，已更新预览，file 对象已设置:', processedFile)
        // alert('✅ 色彩处理成功！图片已经反色（黑变白，白变黑），可以保存了')
      }, file?.type || 'image/png')
    } catch (error) {
      console.error('图片处理失败:', error)
      if (error.name === 'SecurityError') {
        alert('❌ 跨域图片无法处理（从外部网站加载的图片）。请先将图片下载到本地，再重新上传。')
      } else {
        alert('❌ 图片处理失败：' + error.message)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const submitData = new FormData()
    submitData.append('name', formData.name)
    submitData.append('texture_tags', JSON.stringify(formData.texture_tags))
    
    console.log('提交纹理数据:', {
      textureId: texture?.id,
      name: formData.name,
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    })
    
    if (file) {
      submitData.append('file', file)
    }

    try {
      if (texture) {
        // 更新模式：使用 FormData 发送
        console.log('更新纹理...')
        await onUpdate(submitData)
      } else {
        // 上传模式
        console.log('上传纹理...')
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
              <label>预览，确认无误，点击下方按钮进行色彩处理（彩色变黑白，黑白变反色）</label>
              <div className="preview-container">
                <img src={previewUrl} alt="预览" className="preview-image" />
              </div>
              <button 
                type="button" 
                onClick={convertToGrayscale} 
                className="btn btn-grayscale"
                style={{ width: '100%', marginTop: '10px' }}
              >
                🎨 色彩处理🎨 
              </button>
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
