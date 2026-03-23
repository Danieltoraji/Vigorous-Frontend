import { useNavigate } from 'react-router-dom'
import './DecorationItem.css'

function DecorationItem({ decoration, onEditDecoration, onDeleteDecoration }) {
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
            <span className="meta-label">装饰 ID：</span>
            <span className="meta-value">{decoration.id}</span>
          </div>
          <div className="decoration-meta-item">
            <span className="meta-label">创建时间：</span>
            <span className="meta-value">{formatDate(decoration.created_at)}</span>
          </div>
          <div className="decoration-meta-item">
            <span className="meta-label">修改时间：</span>
            <span className="meta-value">{formatDate(decoration.edited_at)}</span>
          </div>
        </div>

        <div className="decoration-tags">
          {
            Array.isArray(decoration.decoration_tags) ? (
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
        <button className="btn btn-secondary" onClick={() => onEditDecoration(decoration)}>
          编辑
        </button>
        <button className="btn btn-danger" onClick={() => onDeleteDecoration(decoration.id)}>
          删除
        </button>
      </div>
    </div>
  )
}

export default DecorationItem
