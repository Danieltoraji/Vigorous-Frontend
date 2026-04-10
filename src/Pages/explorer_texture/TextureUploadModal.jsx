import { useState, useEffect, useRef } from 'react'
import './TextureUploadModal.css'

function TextureUploadModal({ texture, onClose, onUpdate, onUpload }) {
  const [formData, setFormData] = useState({
    name: '',
    texture_tags: []
  })
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [tagInput, setTagInput] = useState('')
  
  // 截取功能相关状态
  const [cropMode, setCropMode] = useState(false) // 是否处于截取模式
  const [cropShape, setCropShape] = useState('rectangle') // 截取形状：'rectangle' 或 'circle'
  const [cropRect, setCropRect] = useState({ x: 50, y: 50, width: 200, height: 200 }) // 截取区域
  const [isDragging, setIsDragging] = useState(false) // 是否正在拖拽
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 }) // 拖拽起始点
  const [resizeHandle, setResizeHandle] = useState(null) // 当前调整大小的手柄：'nw','ne','sw','se','n','s','e','w'
  const canvasRef = useRef(null) // Canvas 引用（用于img元素）
  const containerRef = useRef(null) // 容器引用

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

  // 启动截取模式
  const startCropMode = () => {
    if (!previewUrl) {
      alert('请先选择图片')
      return
    }
    setCropMode(true)
    // 初始化截取区域为图片中心的一个合适大小
    setTimeout(() => {
      if (containerRef.current) {
        const container = containerRef.current
        const rect = container.getBoundingClientRect()
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        const size = Math.min(rect.width, rect.height) * 0.6
        
        setCropRect({
          x: centerX - size / 2,
          y: centerY - size / 2,
          width: size,
          height: size
        })
      }
    }, 100)
  }

  // 取消截取模式
  const cancelCropMode = () => {
    setCropMode(false)
  }

  // 执行截取操作
  const executeCrop = async () => {
    if (!previewUrl || !canvasRef.current) return
    
    try {
      const imgElement = canvasRef.current
      
      // 获取原始图片
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = previewUrl
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })
      
      // 获取img元素的显示尺寸和位置
      const imgRect = imgElement.getBoundingClientRect()
      const containerRect = containerRef.current.getBoundingClientRect()
      
      // 计算图片在 object-fit: contain 下的实际显示尺寸
      // object-fit: contain 会保持宽高比，在容器内居中显示
      const imgAspectRatio = img.naturalWidth / img.naturalHeight
      const containerAspectRatio = containerRect.width / containerRect.height
      
      let imgDisplayWidth, imgDisplayHeight, imgOffsetX, imgOffsetY
      
      if (imgAspectRatio > containerAspectRatio) {
        // 图片更宽，以宽度为准
        imgDisplayWidth = containerRect.width
        imgDisplayHeight = containerRect.width / imgAspectRatio
        imgOffsetX = 0
        imgOffsetY = (containerRect.height - imgDisplayHeight) / 2
      } else {
        // 图片更高，以高度为准
        imgDisplayHeight = containerRect.height
        imgDisplayWidth = containerRect.height * imgAspectRatio
        imgOffsetX = (containerRect.width - imgDisplayWidth) / 2
        imgOffsetY = 0
      }
      
      console.log('图片显示信息:', {
        原始尺寸: `${img.naturalWidth}x${img.naturalHeight}`,
        原始宽高比: imgAspectRatio.toFixed(3),
        容器尺寸: `${containerRect.width.toFixed(0)}x${containerRect.height.toFixed(0)}`,
        容器宽高比: containerAspectRatio.toFixed(3),
        实际显示尺寸: `${imgDisplayWidth.toFixed(0)}x${imgDisplayHeight.toFixed(0)}`,
        偏移量: `${imgOffsetX.toFixed(0)},${imgOffsetY.toFixed(0)}`,
        填充方式: imgAspectRatio > containerAspectRatio ? '上下填充' : '左右填充'
      })
      
      // 计算缩放比例（基于图片的实际显示尺寸）
      const scaleX = img.naturalWidth / imgDisplayWidth
      const scaleY = img.naturalHeight / imgDisplayHeight
      
      // 调整截取区域坐标（减去图片偏移量）
      const adjustedX = cropRect.x - imgOffsetX
      const adjustedY = cropRect.y - imgOffsetY
      const adjustedWidth = cropRect.width
      const adjustedHeight = cropRect.height
      
      console.log('截取计算:', {
        截取区域: `${cropRect.x},${cropRect.y},${cropRect.width}x${cropRect.height}`,
        调整后区域: `${adjustedX.toFixed(0)},${adjustedY.toFixed(0)},${adjustedWidth.toFixed(0)}x${adjustedHeight.toFixed(0)}`,
        截取形状: cropShape,
        是否正方形: cropRect.width === cropRect.height ? '是' : '否',
        缩放比例: `${scaleX.toFixed(2)}x${scaleY.toFixed(2)}`
      })
      
      // 转换为实际像素坐标
      let actualX = adjustedX * scaleX
      let actualY = adjustedY * scaleY
      let actualWidth = adjustedWidth * scaleX
      let actualHeight = adjustedHeight * scaleY
      
      console.log('转换后的实际像素:', {
        actualX: actualX.toFixed(2),
        actualY: actualY.toFixed(2),
        actualWidth: actualWidth.toFixed(2),
        actualHeight: actualHeight.toFixed(2)
      })
      
      // 如果是圆形截取，需要调整为正方形区域
      if (cropShape === 'circle') {
        // 取较小的边长作为正方形的边长
        const minSize = Math.min(actualWidth, actualHeight)
        
        // 计算中心点
        const centerX = actualX + actualWidth / 2
        const centerY = actualY + actualHeight / 2
        
        // 以中心点为准，重新计算正方形的位置
        actualX = centerX - minSize / 2
        actualY = centerY - minSize / 2
        actualWidth = minSize
        actualHeight = minSize
        
        console.log('圆形截取调整为正方形:', {
          中心点: `${centerX.toFixed(0)},${centerY.toFixed(0)}`,
          最终位置: `${actualX.toFixed(0)},${actualY.toFixed(0)}`,
          最终尺寸: `${actualWidth.toFixed(0)}x${actualHeight.toFixed(0)}`
        })
      }
      
      // 创建新的canvas用于截取
      const canvasWidth = Math.round(actualWidth)
      const canvasHeight = Math.round(actualHeight)
      const cropCanvas = document.createElement('canvas')
      cropCanvas.width = canvasWidth
      cropCanvas.height = canvasHeight
      const cropCtx = cropCanvas.getContext('2d')
      
      if (cropShape === 'circle') {
        // 圆形截取：先创建圆形路径并裁剪
        cropCtx.beginPath()
        // 使用Canvas实际尺寸的一半作为半径，确保完美圆形
        const radius = canvasWidth / 2
        cropCtx.arc(canvasWidth / 2, canvasHeight / 2, radius, 0, Math.PI * 2)
        cropCtx.closePath()
        cropCtx.clip()
        
        // 填充透明背景（确保圆外完全透明）
        cropCtx.clearRect(0, 0, canvasWidth, canvasHeight)
      }
      
      // 绘制截取部分
      cropCtx.drawImage(
        img,
        Math.round(actualX), Math.round(actualY), Math.round(actualWidth), Math.round(actualHeight), // 源图像截取区域
        0, 0, canvasWidth, canvasHeight // 目标canvas区域
      )
      
      // 生成截取后的Blob - 始终使用PNG格式以保留透明度
      cropCanvas.toBlob((blob) => {
        if (!blob) {
          alert('截取失败，请重试')
          return
        }
        
        // 创建新的File对象，强制使用PNG格式
        const originalName = file?.name || `cropped_${Date.now()}`
        const fileName = originalName.replace(/\.[^/.]+$/, '') + '.png'
        const croppedFile = new File([blob], fileName, { type: 'image/png' })
        setFile(croppedFile)
        
        // 更新预览
        const croppedUrl = URL.createObjectURL(blob)
        setPreviewUrl(croppedUrl)
        
        // 退出截取模式
        setCropMode(false)
        
        console.log('✅ 截取完成，输出尺寸:', `${canvasWidth}x${canvasHeight}`, '格式：PNG（保留透明度）')
        console.log('📊 详细对比:', {
          预览中的圆形直径: `${cropRect.width}px (显示区域)`,
          实际图片缩放比例: `X:${scaleX.toFixed(2)}, Y:${scaleY.toFixed(2)}`,
          理论最小缩放: Math.min(scaleX, scaleY).toFixed(2),
          截取的实际直径: `${canvasWidth}px (原始图片像素)`,
          如果按minScale计算: `${Math.round(cropRect.width * Math.min(scaleX, scaleY))}px`,
          如果按X轴计算: `${Math.round(cropRect.width * scaleX)}px`,
          如果按Y轴计算: `${Math.round(cropRect.height * scaleY)}px`
        })
      }, 'image/png')
      
    } catch (error) {
      console.error('❌ 截取失败:', error)
      alert('截取失败：' + error.message)
    }
  }

  // 检测鼠标位置是否在调整大小的手柄上
  const getResizeHandle = (x, y, rect) => {
    const handleSize = 10
    const handles = {
      nw: { x: rect.x, y: rect.y },
      ne: { x: rect.x + rect.width, y: rect.y },
      sw: { x: rect.x, y: rect.y + rect.height },
      se: { x: rect.x + rect.width, y: rect.y + rect.height },
      n: { x: rect.x + rect.width / 2, y: rect.y },
      s: { x: rect.x + rect.width / 2, y: rect.y + rect.height },
      e: { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
      w: { x: rect.x, y: rect.y + rect.height / 2 }
    }
    
    for (const [handle, pos] of Object.entries(handles)) {
      if (
        Math.abs(x - pos.x) <= handleSize &&
        Math.abs(y - pos.y) <= handleSize
      ) {
        return handle
      }
    }
    return null
  }

  // 鼠标事件处理函数
  const handleMouseDown = (e) => {
    if (!cropMode) return
    
    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // 检查是否在调整大小的手柄上
    const handle = getResizeHandle(x, y, cropRect)
    if (handle) {
      setResizeHandle(handle)
      setIsDragging(true)
      setDragStart({ x, y })
      return
    }
    
    // 检查点击是否在截取区域内（移动）
    if (
      x >= cropRect.x &&
      x <= cropRect.x + cropRect.width &&
      y >= cropRect.y &&
      y <= cropRect.y + cropRect.height
    ) {
      setIsDragging(true)
      setDragStart({
        x: x - cropRect.x,
        y: y - cropRect.y
      })
    }
  }

  const handleMouseMove = (e) => {
    if (!cropMode || !isDragging) return
    
    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    if (resizeHandle) {
      // 调整大小
      const dx = x - dragStart.x
      const dy = y - dragStart.y
      
      setCropRect(prev => {
        let newRect = { ...prev }
        const minSize = 50
        
        // 如果是圆形模式，强制保持正方形比例
        if (cropShape === 'circle') {
          // 计算新的尺寸（取dx和dy中较大的变化量）
          let newSize = prev.width
          
          switch (resizeHandle) {
            case 'se': // 右下角
              newSize = Math.max(minSize, prev.width + Math.max(dx, dy))
              newRect.width = newSize
              newRect.height = newSize
              break
            case 'sw': // 左下角
              newSize = Math.max(minSize, prev.width + Math.max(-dx, dy))
              newRect.x = prev.x + (prev.width - newSize)
              newRect.width = newSize
              newRect.height = newSize
              break
            case 'ne': // 右上角
              newSize = Math.max(minSize, prev.width + Math.max(dx, -dy))
              newRect.width = newSize
              newRect.y = prev.y + (prev.height - newSize)
              newRect.height = newSize
              break
            case 'nw': // 左上角
              newSize = Math.max(minSize, prev.width + Math.max(-dx, -dy))
              newRect.x = prev.x + (prev.width - newSize)
              newRect.y = prev.y + (prev.height - newSize)
              newRect.width = newSize
              newRect.height = newSize
              break
            case 'e': // 右边
            case 'w': // 左边
            case 's': // 下边
            case 'n': // 上边
              // 对于边手柄，使用对应的变化量
              const delta = ['e', 's'].includes(resizeHandle) ? Math.max(dx, dy) : Math.max(-dx, -dy)
              newSize = Math.max(minSize, prev.width + delta)
              
              if (resizeHandle === 'e' || resizeHandle === 'w') {
                if (resizeHandle === 'w') {
                  newRect.x = prev.x + (prev.width - newSize)
                }
              } else {
                if (resizeHandle === 'n') {
                  newRect.y = prev.y + (prev.height - newSize)
                }
              }
              newRect.width = newSize
              newRect.height = newSize
              break
          }
        } else {
          // 矩形模式：允许自由调整
          switch (resizeHandle) {
            case 'se': // 右下角
              newRect.width = Math.max(minSize, prev.width + dx)
              newRect.height = Math.max(minSize, prev.height + dy)
              break
            case 'sw': // 左下角
              newRect.x = prev.x + dx
              newRect.width = Math.max(minSize, prev.width - dx)
              newRect.height = Math.max(minSize, prev.height + dy)
              break
            case 'ne': // 右上角
              newRect.width = Math.max(minSize, prev.width + dx)
              newRect.y = prev.y + dy
              newRect.height = Math.max(minSize, prev.height - dy)
              break
            case 'nw': // 左上角
              newRect.x = prev.x + dx
              newRect.y = prev.y + dy
              newRect.width = Math.max(minSize, prev.width - dx)
              newRect.height = Math.max(minSize, prev.height - dy)
              break
            case 'e': // 右边
              newRect.width = Math.max(minSize, prev.width + dx)
              break
            case 'w': // 左边
              newRect.x = prev.x + dx
              newRect.width = Math.max(minSize, prev.width - dx)
              break
            case 's': // 下边
              newRect.height = Math.max(minSize, prev.height + dy)
              break
            case 'n': // 上边
              newRect.y = prev.y + dy
              newRect.height = Math.max(minSize, prev.height - dy)
              break
          }
        }
        
        // 确保不超出容器边界
        newRect.x = Math.max(0, Math.min(newRect.x, rect.width - newRect.width))
        newRect.y = Math.max(0, Math.min(newRect.y, rect.height - newRect.height))
        newRect.width = Math.min(newRect.width, rect.width - newRect.x)
        newRect.height = Math.min(newRect.height, rect.height - newRect.y)
        
        // 圆形模式下再次确保是正方形
        if (cropShape === 'circle') {
          const finalSize = Math.min(newRect.width, newRect.height)
          newRect.width = finalSize
          newRect.height = finalSize
        }
        
        return newRect
      })
      
      setDragStart({ x, y })
    } else {
      // 移动截取区域
      setCropRect(prev => ({
        ...prev,
        x: Math.max(0, Math.min(x - dragStart.x, rect.width - prev.width)),
        y: Math.max(0, Math.min(y - dragStart.y, rect.height - prev.height))
      }))
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setResizeHandle(null)
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
    <div className="texture-modal-overlay" onClick={onClose}>
      <div className="texture-modal-content" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="texture-form">
          <div className="texture-modal-header">
            <h2>{texture ? '编辑纹理' : '上传纹理'}</h2>
            <button type="button" className="texture-close-button" onClick={onClose}>×</button>
          </div>

          <div className="texture-form-body">
            <div className="texture-form-group">
              <label>纹理名称</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="输入纹理名称"
                required
              />
            </div>

            <div className="texture-form-row texture-file-preview-row">
              <div className="texture-form-group texture-file-group">
                <label className="texture-file-label">
                  <span>选择文件</span>
                  {file && <span className="texture-file-name">{file.name}</span>}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  required={!texture}
                />
                <small>支持格式：PNG, JPG, JPEG, WEBP</small>
              </div>

              <div className="texture-form-group texture-preview-group">
                <label>预览，确认无误，点击下方按钮进行色彩处理（彩色变黑白，黑白变反色）</label>
                <div className="texture-preview-container">
                  {previewUrl ? (
                    <div 
                      ref={containerRef}
                      style={{ position: 'relative', width: '100%', height: '100%' }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    >
                      <img 
                        src={previewUrl} 
                        alt="预览" 
                        className="texture-preview-image"
                        ref={canvasRef}
                        style={{ pointerEvents: cropMode ? 'none' : 'auto' }}
                      />
                      
                      {/* 截取区域 */}
                      {cropMode && (
                        <>
                          {/* 半透明遮罩层 - 四个方向 */}
                          <div 
                            className="crop-mask"
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: `${cropRect.y}px`,
                              backgroundColor: 'rgba(0, 0, 0, 0.5)',
                              pointerEvents: 'none'
                            }}
                          />
                          <div 
                            className="crop-mask"
                            style={{
                              position: 'absolute',
                              top: `${cropRect.y + cropRect.height}px`,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: 'rgba(0, 0, 0, 0.5)',
                              pointerEvents: 'none'
                            }}
                          />
                          <div 
                            className="crop-mask"
                            style={{
                              position: 'absolute',
                              top: `${cropRect.y}px`,
                              left: 0,
                              width: `${cropRect.x}px`,
                              height: `${cropRect.height}px`,
                              backgroundColor: 'rgba(0, 0, 0, 0.5)',
                              pointerEvents: 'none'
                            }}
                          />
                          <div 
                            className="crop-mask"
                            style={{
                              position: 'absolute',
                              top: `${cropRect.y}px`,
                              left: `${cropRect.x + cropRect.width}px`,
                              right: 0,
                              height: `${cropRect.height}px`,
                              backgroundColor: 'rgba(0, 0, 0, 0.5)',
                              pointerEvents: 'none'
                            }}
                          />
                          
                          {/* 截取区域边框和手柄容器 */}
                          <div 
                            className="crop-border-container"
                            style={{
                              position: 'absolute',
                              left: `${cropRect.x}px`,
                              top: `${cropRect.y}px`,
                              width: `${cropRect.width}px`,
                              height: `${cropRect.height}px`,
                              pointerEvents: 'auto'
                            }}
                          >
                            {/* 截取区域边框 */}
                            <div 
                              className="crop-border"
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                width: '100%',
                                height: '100%',
                                border: '2px solid #fff',
                                boxSizing: 'border-box',
                                borderRadius: cropShape === 'circle' ? '50%' : '4px',
                                cursor: 'move',
                                pointerEvents: 'auto'
                              }}
                              onMouseDown={handleMouseDown}
                            />
                            
                            {/* 8个调整大小的手柄 */}
                            <div 
                              className="resize-handle nw"
                              style={{
                                position: 'absolute',
                                top: '-5px',
                                left: '-5px',
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#fff',
                                border: '2px solid #0078d4',
                                borderRadius: '50%',
                                cursor: 'nw-resize',
                                zIndex: 10,
                                pointerEvents: 'auto'
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleMouseDown(e);
                              }}
                            />
                            <div 
                              className="resize-handle ne"
                              style={{
                                position: 'absolute',
                                top: '-5px',
                                right: '-5px',
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#fff',
                                border: '2px solid #0078d4',
                                borderRadius: '50%',
                                cursor: 'ne-resize',
                                zIndex: 10,
                                pointerEvents: 'auto'
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleMouseDown(e);
                              }}
                            />
                            <div 
                              className="resize-handle sw"
                              style={{
                                position: 'absolute',
                                bottom: '-5px',
                                left: '-5px',
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#fff',
                                border: '2px solid #0078d4',
                                borderRadius: '50%',
                                cursor: 'sw-resize',
                                zIndex: 10,
                                pointerEvents: 'auto'
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleMouseDown(e);
                              }}
                            />
                            <div 
                              className="resize-handle se"
                              style={{
                                position: 'absolute',
                                bottom: '-5px',
                                right: '-5px',
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#fff',
                                border: '2px solid #0078d4',
                                borderRadius: '50%',
                                cursor: 'se-resize',
                                zIndex: 10,
                                pointerEvents: 'auto'
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleMouseDown(e);
                              }}
                            />
                            <div 
                              className="resize-handle n"
                              style={{
                                position: 'absolute',
                                top: '-5px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#fff',
                                border: '2px solid #0078d4',
                                borderRadius: '50%',
                                cursor: 'n-resize',
                                zIndex: 10,
                                pointerEvents: 'auto'
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleMouseDown(e);
                              }}
                            />
                            <div 
                              className="resize-handle s"
                              style={{
                                position: 'absolute',
                                bottom: '-5px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#fff',
                                border: '2px solid #0078d4',
                                borderRadius: '50%',
                                cursor: 's-resize',
                                zIndex: 10,
                                pointerEvents: 'auto'
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleMouseDown(e);
                              }}
                            />
                            <div 
                              className="resize-handle e"
                              style={{
                                position: 'absolute',
                                top: '50%',
                                right: '-5px',
                                transform: 'translateY(-50%)',
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#fff',
                                border: '2px solid #0078d4',
                                borderRadius: '50%',
                                cursor: 'e-resize',
                                zIndex: 10,
                                pointerEvents: 'auto'
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleMouseDown(e);
                              }}
                            />
                            <div 
                              className="resize-handle w"
                              style={{
                                position: 'absolute',
                                top: '50%',
                                left: '-5px',
                                transform: 'translateY(-50%)',
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#fff',
                                border: '2px solid #0078d4',
                                borderRadius: '50%',
                                cursor: 'w-resize',
                                zIndex: 10,
                                pointerEvents: 'auto'
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleMouseDown(e);
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="texture-preview-empty">选择文件后显示预览</div>
                  )}
                </div>
                
                {/* 截取控制按钮 */}
                {cropMode ? (
                  <div className="crop-controls">
                    <div className="crop-buttons-row">
                      <button
                        type="button"
                        onClick={() => {
                          setCropShape('rectangle')
                        }}
                        className={`shape-btn ${cropShape === 'rectangle' ? 'active' : ''}`}
                      >
                        ▭ 矩形
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCropShape('circle')
                          // 切换到圆形时，自动调整为正方形（以较短边为准）
                          setCropRect(prev => {
                            const minSize = Math.min(prev.width, prev.height)
                            return {
                              ...prev,
                              width: minSize,
                              height: minSize
                            }
                          })
                        }}
                        className={`shape-btn ${cropShape === 'circle' ? 'active' : ''}`}
                      >
                        ○ 圆形
                      </button>
                      <button
                        type="button"
                        onClick={cancelCropMode}
                        className="texture-modal-btn texture-modal-btn-cancel"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={executeCrop}
                        className="texture-modal-btn texture-modal-btn-confirm"
                      >
                        确认截取
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                    <button
                      type="button"
                      onClick={convertToGrayscale}
                      className="texture-modal-btn texture-modal-btn-grayscale"
                      disabled={!previewUrl}
                      style={{ flex: 1 }}
                    >
                      🎨 色彩处理🎨
                    </button>
                    <button
                      type="button"
                      onClick={startCropMode}
                      className="texture-modal-btn texture-modal-btn-crop"
                      disabled={!previewUrl}
                      style={{ flex: 1 }}
                    >
                      ✂️ 截取图片✂️
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="texture-form-group">
              <label>标签</label>
              <div className="texture-tag-input-container">
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
                <button type="button" onClick={handleAddTag} className="texture-modal-btn texture-modal-btn-secondary">
                  添加
                </button>
              </div>
              <div className="texture-tags-container">
                {formData.texture_tags.map((tag, index) => (
                  <span key={index} className="texture-tag">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="texture-remove-tag"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="texture-form-actions">
            <button type="button" onClick={onClose} className="texture-modal-btn texture-modal-btn-secondary">
              取消
            </button>
            <button type="submit" className="texture-modal-btn texture-modal-btn-primary">
              {texture ? '保存修改' : '上传'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TextureUploadModal
