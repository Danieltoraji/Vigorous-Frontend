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
const ListView = ({ pieces, onEdit, onOpen, onDelete }) => {
  return (
    <div className="list-view">
      <table className="chess-table">
        <thead>
          <tr>
            <th>名称</th>
            <th>ID</th>
            <th>类型</th>
            <th>标签</th>
            <th>创建时间</th>
            <th>最后编辑</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {pieces.map((piece) => (
            <ChessRow
              key={piece.id}
              piece={piece}
              onEdit={onEdit}
              onOpen={onOpen}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ChessRow = ({ piece, onEdit, onOpen, onDelete }) => {
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
    <tr>
      <td>{piece.name}</td>
      <td>{piece.id}</td>
      <td>{piece.type}</td>
      <td>
        <div className="table-tags">
          {piece.piece_tags && piece.piece_tags.length > 0 ? (
            piece.piece_tags.map((tag, index) => (
              <span key={index} className="table-tag">
                {tag}
              </span>
            ))
          ) : (
            <span className="no-tags">无</span>
          )}
        </div>
      </td>
      <td>{formatDate(piece.created_at)}</td>
      <td>{formatDate(piece.edited_at)}</td>
      <td className="action-buttons">
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
      </td>
    </tr>
  )
}

export default ListView;