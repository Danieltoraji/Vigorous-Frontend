import React, { useState, useEffect } from 'react';
import { useDecoration } from '../../hooks/useDecoration.jsx';
import { useNavigate } from 'react-router-dom';
import './choose_decoration.css';

const PRESET_DECORATIONS = [
  { id: '0', name: '无装饰', icon: '○' },
  { id: '1', name: '小旗子', icon: '🚩' },
  { id: '2', name: '五角星', icon: '⭐' },
  { id: '3', name: '圆球', icon: '●' },
  { id: '4', name: '四棱锥', icon: '▲' },
];

// 基础几何图形列表
const BASIC_GEOMETRIES = [
  { id: 'geo_sphere', name: '球体', icon: '🔵' },
  { id: 'geo_cube', name: '立方体', icon: '🟧' },
  { id: 'geo_cylinder', name: '圆柱体', icon: '🛢️' },
  { id: 'geo_cone', name: '圆锥体', icon: '🔺' },
];

function ChooseDecoration({ isOpen, onClose, currentModelId, onSelect, onSaveAndNavigate }) {
  const { decorationData, loading, error } = useDecoration();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(currentModelId || '0');
  const [selectedType, setSelectedType] = useState('preset');

  useEffect(() => {
    if (currentModelId) {
      const isPreset = PRESET_DECORATIONS.some(d => d.id === currentModelId);
      const isBasicGeometry = BASIC_GEOMETRIES.some(d => d.id === currentModelId);
      if (isPreset) {
        setSelectedType('preset');
      } else if (isBasicGeometry) {
        setSelectedType('basic');
      } else {
        setSelectedType('custom');
      }
      setSelectedId(currentModelId);
    }
  }, [currentModelId, isOpen]);

  const handleSelect = (id, type) => {
    setSelectedId(id);
    setSelectedType(type);
  };

  const handleConfirm = () => {
    if (onSelect) {
      onSelect(selectedId, selectedType);
    }
    onClose();
  };

  const handleNavigateToExplorer = async () => {
    if (onSaveAndNavigate) {
      await onSaveAndNavigate();
    }
    onClose();
    navigate('/explorer-decoration');
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const customDecorations = Object.values(decorationData || {});

  return (
    <div className="decoration-modal-overlay" onClick={handleOverlayClick}>
      <div className="decoration-modal">
        <div className="decoration-modal-header">
          <h2>选择模型</h2>
          <button className="decoration-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="decoration-modal-content">
          <div className="decoration-section">
            <h3 className="decoration-section-title">预设</h3>
            <div className="decoration-cards-grid">
              {PRESET_DECORATIONS.map((decoration) => (
                <div
                  key={decoration.id}
                  className={`decoration-card ${selectedId === decoration.id && selectedType === 'preset' ? 'selected' : ''}`}
                  onClick={() => handleSelect(decoration.id, 'preset')}
                >
                  <div className="decoration-card-icon">{decoration.icon}</div>
                  <div className="decoration-card-name">{decoration.name}</div>
                  {selectedId === decoration.id && selectedType === 'preset' && (
                    <div className="decoration-card-check">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="decoration-section">
            <h3 className="decoration-section-title">基础几何图形</h3>
            <div className="decoration-cards-grid">
              {BASIC_GEOMETRIES.map((geometry) => (
                <div
                  key={geometry.id}
                  className={`decoration-card ${selectedId === geometry.id && selectedType === 'basic' ? 'selected' : ''}`}
                  onClick={() => handleSelect(geometry.id, 'basic')}
                >
                  <div className="decoration-card-icon">{geometry.icon}</div>
                  <div className="decoration-card-name">{geometry.name}</div>
                  {selectedId === geometry.id && selectedType === 'basic' && (
                    <div className="decoration-card-check">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="decoration-section">
            <h3 className="decoration-section-title">自定义</h3>
            <div className="decoration-cards-grid">
              {loading && (
                <div className="decoration-loading">加载中...</div>
              )}
              {error && (
                <div className="decoration-error">加载失败: {error}</div>
              )}
              {!loading && !error && customDecorations.length === 0 && (
                <div className="decoration-empty">暂无自定义装饰</div>
              )}
              {!loading && !error && customDecorations.map((decoration) => (
                <div
                  key={decoration.id}
                  className={`decoration-card ${selectedId === decoration.id && selectedType === 'custom' ? 'selected' : ''}`}
                  onClick={() => handleSelect(decoration.id, 'custom')}
                >
                  <div className="decoration-card-icon">
                    {decoration.thumbnail ? (
                      <img src={decoration.thumbnail} alt={decoration.name} />
                    ) : (
                      '📦'
                    )}
                  </div>
                  <div className="decoration-card-name">{decoration.name}</div>
                  {selectedId === decoration.id && selectedType === 'custom' && (
                    <div className="decoration-card-check">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="decoration-modal-footer">
          <button className="decoration-btn decoration-btn-cancel" onClick={onClose}>
            取消
          </button>
          <button 
            className="decoration-btn decoration-btn-explorer" 
            onClick={handleNavigateToExplorer}
          >
            前往模型资源管理器
          </button>
          <button className="decoration-btn decoration-btn-confirm" onClick={handleConfirm}>
            确认选择
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChooseDecoration;
