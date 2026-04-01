import React from 'react';
import './modals.css';

const DeleteConfirmModal = ({ piece, onConfirm, onCancel }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>确认删除</h3>
          <button className="modal-close" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p>您确定要删除棋子 <strong>{piece?.name}</strong> 吗？</p>
          <p className="delete-warning">此操作不可撤销，删除后棋子数据将无法恢复。</p>
        </div>
        <div className="modal-actions">
          <button className="cancel-button" onClick={onCancel}>
            取消
          </button>
          <button className="delete-button" onClick={onConfirm}>
            删除
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;