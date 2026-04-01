import React from 'react';
import './modals.css';

const DeleteConfirmModal = ({ piece, onConfirm, onCancel }) => {
  return (
    <div className="modals-modal-overlay">
      <div className="modals-modal-content">
        <div className="modals-modal-header">
          <h3>确认删除</h3>
          <button className="modals-modal-close" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="modals-modal-body">
          <p>您确定要删除棋子 <strong>{piece?.name}</strong> 吗？</p>
          <p className="modals-delete-warning">此操作不可撤销，删除后棋子数据将无法恢复。</p>
        </div>
        <div className="modals-modal-actions">
          <button className="modals-cancel-button" onClick={onCancel}>
            取消
          </button>
          <button className="modals-delete-button" onClick={onConfirm}>
            删除
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;