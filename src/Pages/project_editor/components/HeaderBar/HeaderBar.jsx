import React from 'react';
import './HeaderBar.css';

const HeaderBar = ({ project, onSave, onBack }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="header-bar">
      <div className="header-left">
        <h1 className="editor-project-name" onClick={onBack}>
          ❮  {project?.name || '项目编辑器'}</h1>
      </div>

      <div className="header-right">
        <span className="save-time">
          最后保存: {formatDate(project?.edited_at)}
        </span>
        <button className="save-button" onClick={onSave}>
          保存
        </button>
      </div>
    </div>
  );
};

export default HeaderBar;