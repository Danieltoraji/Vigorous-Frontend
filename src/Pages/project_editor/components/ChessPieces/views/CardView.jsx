import React from 'react';
import './views.css';
// 格式化日期
const formatDate = (dateString) => {
  if (!dateString || dateString === '无数据') return '无数据';

  try {
    const date = new Date(dateString);
    // 检查日期是否有效
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
const CardView = ({ pieces, onEdit, onOpen, onDelete }) => {
  return (
    <div className="card-view">
      {pieces.map((piece) => (
        <div key={piece.id} className="chess-card">
          <div className="chess-card-header">
            <h3>{piece.name}</h3>
            <span className="chess-type">{piece.type}</span>
          </div>
          <div className="chess-card-body">
            <div className="chess-meta">
              <span>ID: {piece.id}</span>
              <span>创建时间: {formatDate(piece.created_at)}</span>
              <span>最后编辑: {formatDate(piece.edited_at)}</span>
            </div>
            {piece.piece_tags && piece.piece_tags.length > 0 && (
              <div className="chess-tags">
                {piece.piece_tags.map((tag, index) => (
                  <span key={index} className="chess-tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="chess-card-actions">
            <button
              className="action-button edit-button"
              onClick={() => onEdit(piece)}
            >
              编辑
            </button>
            <button
              className="action-button open-button"
              onClick={() => onOpen(piece)}
            >
              打开
            </button>
            <button
              className="action-button delete-button"
              onClick={() => onDelete(piece)}
            >
              删除
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CardView;