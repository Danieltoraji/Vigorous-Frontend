import { useNavigate } from 'react-router-dom'
import './TextureItem.css'

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

  return (
    <div className="texture-item">
      <div className="texture-item-header">
        <h3 className="texture-name">{texture.name}</h3>
        <span className="texture-format">{getFileExtension(texture.file)}</span>
      </div>

      <div className="texture-item-body">
        <div className="texture-preview">
          {texture.file ? (
            <img src={texture.file} alt={texture.name} />
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

      <div className="texture-item-footer">
        <button className="btn btn-secondary" onClick={() => onEditTexture(texture)}>
          编辑
        </button>
        <button className="btn btn-danger" onClick={() => onDeleteTexture(texture.id)}>
          删除
        </button>
      </div>
    </div>
  )
}

export default TextureItem
