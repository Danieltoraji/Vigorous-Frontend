import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import './TextureItem.css'
import { resolveMediaUrl } from '../../utils/mediaUrl.js'

function TextureItem({ texture, onEditTexture, onDeleteTexture }) {
  const navigate = useNavigate()

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString || dateString === '无数据') return '无数据';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      return date.toLocaleString('zh-CN', {
        year: 'numeric',
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

  const textureFileUrl = resolveMediaUrl(texture.file)

  return (
    <div className="texture-item" onClick={() => onEditTexture(texture)}>
      <div className="texture-item-content">
        <div className="texture-item-header">
          <h3 className="texture-name">{texture.name}</h3>
          <span className="texture-format">{getFileExtension(texture.file)}</span>
        </div>

        <div className="texture-item-body">
          <div className="texture-preview">
            {textureFileUrl ? (
              <img src={textureFileUrl} alt={texture.name} />
            ) : (
              <div className="no-preview">无预览</div>
            )}
          </div>

          <div className="texture-meta">
            <div className="texture-meta-item">
              <span className="meta-label">纹理 ID：</span>
              <span className="meta-value">{texture.id}</span>
            </div>
            <div className="texture-meta-item">
              <span className="meta-label">创建时间：</span>
              <span className="meta-value">{formatDate(texture.created_at)}</span>
            </div>
            <div className="texture-meta-item">
              <span className="meta-label">修改时间：</span>
              <span className="meta-value">{formatDate(texture.edited_at)}</span>
            </div>
          </div>

          <div className="texture-tags">
            {
              Array.isArray(texture.texture_tags) ? (
                texture.texture_tags.map((tag, index) => (
                  <span key={index} className="texture-tag">{tag}</span>
                ))
              ) : (
                <span className="texture-tag">无标签</span>
              )
            }
          </div>
        </div>
      </div>

      <div className="texture-item-footer">
        <button
          type="button"
          className="btn btn-outline delete-btn"
          onClick={(e) => {
            e.stopPropagation()
            if (window.confirm('确定要删除这个纹理吗？')) {
              onDeleteTexture(texture.id)
            }
          }}
        >
          删除
        </button>
      </div>
    </div>
  )
}

export default TextureItem
