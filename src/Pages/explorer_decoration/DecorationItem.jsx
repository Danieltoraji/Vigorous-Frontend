import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import './DecorationItem.css'

function DecorationItem({ decoration, onEditDecoration, onDeleteDecoration, onPreviewDecoration }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return undefined

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  // 格式化日期 - 简短格式
  const formatDate = (dateString) => {
    if (!dateString || dateString === '无数据') return '无数据';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (e) {
      return dateString;
    }
  };

  // 获取文件扩展名
  const getFileExtension = (filename) => {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  };

  return (
    <div className="decoration-item">
      <div className="decoration-item-header">
        <h3 className="decoration-name">{decoration.name}</h3>
        <span className="decoration-format">{getFileExtension(decoration.file)}</span>
      </div>

      <div className="decoration-item-body">
        <div className="decoration-preview">
          {decoration.file ? (
            <div className="file-info">
              <span className="file-icon">📦</span>
              <span className="file-name">{decoration.file.split('/').pop()}</span>
            </div>
          ) : (
            <div className="no-preview">无文件</div>
          )}
        </div>

        <div className="decoration-meta">
          <div className="decoration-meta-item">
            <span className="meta-label">创建：</span>
            <span className="meta-value">{formatDate(decoration.created_at)}</span>
          </div>
          <div className="decoration-meta-item">
            <span className="meta-label">修改：</span>
            <span className="meta-value">{formatDate(decoration.edited_at)}</span>
          </div>
        </div>

        <div className="decoration-tags">
          {
            Array.isArray(decoration.decoration_tags) && decoration.decoration_tags.length > 0 ? (
              decoration.decoration_tags.map((tag, index) => (
                <span key={index} className="decoration-tag">{tag}</span>
              ))
            ) : (
              <span className="decoration-tag">无标签</span>
            )
          }
        </div>
      </div>

      <div className="decoration-item-footer">
        <div className="more-actions" ref={menuRef}>
          <button
            type="button"
            className="btn btn-outline more-actions-toggle"
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label="更多操作"
            title="更多操作"
          >
            ...
          </button>
          {menuOpen && (
            <div className="more-actions-menu">
              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  setMenuOpen(false)
                  onEditDecoration(decoration)
                }}
              >
                编辑
              </button>
              <button
                type="button"
                className="menu-item delete"
                onClick={() => {
                  setMenuOpen(false)
                  onDeleteDecoration(decoration.id)
                }}
              >
                删除
              </button>
            </div>
          )}
        </div>
        <button className="btn btn-preview" onClick={() => onPreviewDecoration(decoration)}>
          预览
        </button>
      </div>
    </div>
  )
}

export default DecorationItem