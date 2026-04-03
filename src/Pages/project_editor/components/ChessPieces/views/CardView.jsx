import React, { useEffect, useRef, useState } from 'react';
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
        <ChessCard
          key={piece.id}
          piece={piece}
          onEdit={onEdit}
          onOpen={onOpen}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

const ChessCard = ({ piece, onEdit, onOpen, onDelete }) => {
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

  return (
    <div className="chess-card">
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
        <div className="more-actions" ref={menuRef}>
          <button
            type="button"
            className="action-button action-menu-button"
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
                  onEdit(piece)
                }}
              >
                编辑
              </button>
              <button
                type="button"
                className="menu-item delete"
                onClick={() => {
                  setMenuOpen(false)
                  onDelete(piece)
                }}
              >
                删除
              </button>
            </div>
          )}
        </div>
        <button
          className="action-button open-button"
          onClick={() => onOpen(piece)}
        >
          打开
        </button>
      </div>
    </div>
  )
};

export default CardView;