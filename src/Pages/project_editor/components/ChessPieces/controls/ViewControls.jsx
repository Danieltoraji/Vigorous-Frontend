import React from 'react';
import './controls.css';

const ViewControls = ({ viewMode, onViewChange }) => {
  return (
    <div className="controls-view-controls">
      <button
        className={`controls-view-button ${viewMode === 'card' ? 'active' : ''}`}
        onClick={() => onViewChange('card')}
      >
        卡片视图
      </button>
      <button
        className={`controls-view-button ${viewMode === 'list' ? 'active' : ''}`}
        onClick={() => onViewChange('list')}
      >
        列表视图
      </button>
    </div>
  );
};

export default ViewControls;