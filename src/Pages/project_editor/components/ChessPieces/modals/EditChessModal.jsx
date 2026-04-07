import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './modals.css';

const EditChessModal = ({ piece, onSave, onCancel }) => {
  const [localPiece, setLocalPiece] = useState(piece || {
    name: '',
    type: '',
    piece_tags: []
  });
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (piece) {
      setLocalPiece(piece);
    }
  }, [piece]);

  const handleInputChange = (field, value) => {
    setLocalPiece({ ...localPiece, [field]: value });
  };

  const handleAddTag = () => {
    if (newTag && !localPiece.piece_tags.includes(newTag)) {
      const updatedTags = [...localPiece.piece_tags, newTag];
      handleInputChange('piece_tags', updatedTags);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const updatedTags = localPiece.piece_tags.filter(tag => tag !== tagToRemove);
    handleInputChange('piece_tags', updatedTags);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(localPiece);
  };

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  };

  return createPortal(
    <div className="modal-overlay" style={overlayStyle}>
      <div className="chess-modal-content">
        <form onSubmit={handleSubmit} className="chess-modal-form">
          <div className="chess-modal-header">
            <h3>编辑棋子</h3>
            <button className="modal-close" onClick={onCancel}>
              ×
            </button>
          </div>
          <div className="form-group">
            <label htmlFor="chess-name">棋子名称</label>
            <input
              type="text"
              id="chess-name"
              value={localPiece.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="请输入棋子名称"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="chess-type">棋子类型</label>
            <input
              type="text"
              id="chess-type"
              value={localPiece.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              placeholder="请输入棋子类型"
              required
            />
          </div>

          <div className="form-group">
            <label>棋子标签</label>
            <div className="tag-input-container">
              <div className="tags">
                {localPiece.piece_tags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                    <button
                      type="button"
                      className="tag-remove"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="tag-input-wrapper">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="添加标签"
                />
                <button
                  type="button"
                  className="add-tag-button"
                  onClick={handleAddTag}
                >
                  添加
                </button>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-button" onClick={onCancel}>
              取消
            </button>
            <button type="submit" className="save-button">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default EditChessModal;