import React, { useState, useRef } from 'react';
import { useTemplates } from '../../../../../hooks/useTemplates';
import { useChess } from '../../../../../hooks/useChess';
import './modals.css';

const ImportChessModal = ({ onCancel, projectId }) => {
  const { templatesData, loading: templatesLoading } = useTemplates();
  const { createChessFromJson } = useChess();

  const [isParsing, setIsParsing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [isCreatingFromTemplates, setIsCreatingFromTemplates] = useState(false);
  const [viewMode, setViewMode] = useState('card'); // 'card' 或 'list'

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      setSelectedFile(file);
    } else if (file) {
      alert('请上传 JSON 文件');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleConfirmJsonImport = () => {
    if (!selectedFile) {
      alert('请选择 JSON 文件');
      return;
    }

    setIsParsing(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const jsonContent = e.target.result;
        const chessJson = JSON.parse(jsonContent);

        await createChessFromJson(projectId, chessJson);

        setIsParsing(false);
        alert('导入成功，棋子已创建');
        onCancel();
      } catch (error) {
        setIsParsing(false);
        console.error('解析失败详情：', error);
        alert('解析失败：' + error.message);
      }
    };

    reader.onerror = () => {
      setIsParsing(false);
      alert('文件读取失败');
    };

    reader.readAsText(selectedFile);
  };

  const handleOpenTemplateSelector = () => {
    setShowTemplateSelector(true);
  };

  const handleTemplateToggle = (templateId) => {
    setSelectedTemplates(prev => {
      if (prev.includes(templateId)) {
        return prev.filter(id => id !== templateId);
      }
      return [...prev, templateId];
    });
  };

  const handleSelectAllTemplates = () => {
    const allTemplateIds = Object.keys(templatesData);
    if (selectedTemplates.length === allTemplateIds.length) {
      setSelectedTemplates([]);
    } else {
      setSelectedTemplates(allTemplateIds);
    }
  };

  const handleConfirmTemplateImport = async () => {
    if (selectedTemplates.length === 0) {
      alert('请至少选择一个模板');
      return;
    }

    setIsCreatingFromTemplates(true);
    let successCount = 0;
    let failCount = 0;

    for (const templateId of selectedTemplates) {
      try {
        const template = templatesData[templateId];
        if (template) {
          await createChessFromJson(projectId, { parts: template.parts });
          successCount++;
        }
      } catch (error) {
        console.error(`从模板 ${templateId} 创建棋子失败:`, error);
        failCount++;
      }
    }

    setIsCreatingFromTemplates(false);

    if (failCount === 0) {
      alert(`成功导入 ${successCount} 个棋子`);
      setShowTemplateSelector(false);
      setSelectedTemplates([]);
      onCancel();
    } else {
      alert(`导入完成：成功 ${successCount} 个，失败 ${failCount} 个`);
    }
  };

  const handleBackToMain = () => {
    setShowTemplateSelector(false);
    setSelectedTemplates([]);
  };

  if (showTemplateSelector) {
    return (
      <div className="modals-modal-overlay">
        <div className="modals-modal-content modals-template-selector-modal">
          <div className="modals-modal-header">
            <h3>从模板导入</h3>
            <button className="modals-modal-close" onClick={handleBackToMain}>
              ×
            </button>
          </div>
          <div className="modals-modal-body">
            {templatesLoading ? (
              <div className="modals-loading-indicator">加载模板中...</div>
            ) : (
              <>
                <div className="modals-template-selector-header">
                  <span className="modals-selected-count">
                    已选择 {selectedTemplates.length} 个模板
                  </span>
                  <div className="modals-template-selector-controls">
                    <div className="modals-view-controls">
                      <button
                        className={`modals-view-button ${viewMode === 'card' ? 'modals-active' : ''}`}
                        onClick={() => setViewMode('card')}
                      >
                        卡片
                      </button>
                      <button
                        className={`modals-view-button ${viewMode === 'list' ? 'modals-active' : ''}`}
                        onClick={() => setViewMode('list')}
                      >
                        列表
                      </button>
                    </div>
                    <button
                      className="modals-select-all-button"
                      onClick={handleSelectAllTemplates}
                    >
                      {selectedTemplates.length === Object.keys(templatesData).length
                        ? '取消全选'
                        : '全选'}
                    </button>
                  </div>
                </div>
                <div className={`modals-template-list ${viewMode === 'card' ? 'modals-card-view' : 'modals-list-view'}`}>
                  {Object.entries(templatesData).map(([id, template]) => (
                    <div
                      key={id}
                      className={`modals-template-item ${selectedTemplates.includes(id) ? 'modals-selected' : ''} ${viewMode === 'card' ? 'modals-card-item' : 'modals-list-item'}`}
                      onClick={() => handleTemplateToggle(id)}
                    >
                      <div className="modals-template-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedTemplates.includes(id)}
                          onChange={() => { }}
                        />
                      </div>
                      {viewMode === 'card' ? (
                        <div className="modals-template-card-content">
                          <h4 className="modals-template-card-title">{template.name || `模板 ${id}`}</h4>
                          <div className="modals-template-card-details">
                            <div className="modals-template-card-detail">
                              <span className="modals-detail-label">ID:</span>
                              <span className="modals-detail-value">{id}</span>
                            </div>
                            {template.description && (
                              <div className="modals-template-card-detail">
                                <span className="modals-detail-label">描述:</span>
                                <span className="modals-detail-value">{template.description}</span>
                              </div>
                            )}
                            {template.created_at && (
                              <div className="modals-template-card-detail">
                                <span className="modals-detail-label">创建时间:</span>
                                <span className="modals-detail-value">{new Date(template.created_at).toLocaleString()}</span>
                              </div>
                            )}
                            {template.updated_at && (
                              <div className="modals-template-card-detail">
                                <span className="modals-detail-label">修改时间:</span>
                                <span className="modals-detail-value">{new Date(template.updated_at).toLocaleString()}</span>
                              </div>
                            )}
                            {template.tags && template.tags.length > 0 && (
                              <div className="modals-template-card-detail">
                                <span className="modals-detail-label">标签:</span>
                                <div className="modals-template-tags">
                                  {template.tags.map((tag, index) => (
                                    <span key={index} className="modals-template-tag">{tag}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="modals-template-list-content">
                          <div className="modals-template-list-main">
                            <span className="modals-template-list-name">{template.name || `模板 ${id}`}</span>
                            {template.description && (
                              <span className="modals-template-list-description">{template.description}</span>
                            )}
                          </div>
                          <div className="modals-template-list-details">
                            <span className="modals-template-list-id">ID: {id}</span>
                            {template.created_at && (
                              <span className="modals-template-list-date">创建: {new Date(template.created_at).toLocaleDateString()}</span>
                            )}
                            {template.updated_at && (
                              <span className="modals-template-list-date">修改: {new Date(template.updated_at).toLocaleDateString()}</span>
                            )}
                            {template.tags && template.tags.length > 0 && (
                              <div className="modals-template-list-tags">
                                {template.tags.map((tag, index) => (
                                  <span key={index} className="modals-template-tag">{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {Object.keys(templatesData).length === 0 && (
                    <div className="modals-empty-templates">暂无可用模板</div>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="modals-modal-actions">
            <button className="modals-cancel-button" onClick={handleBackToMain}>
              返回
            </button>
            <button
              className="modals-confirm-button"
              onClick={handleConfirmTemplateImport}
              disabled={isCreatingFromTemplates || selectedTemplates.length === 0}
            >
              {isCreatingFromTemplates ? '创建中...' : `确认导入 (${selectedTemplates.length})`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modals-modal-overlay">
      <div className="modals-modal-content">
        <div className="modals-modal-header">
          <h3>导入棋子</h3>
          <button className="modals-modal-close" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="modals-modal-body">
          <div
            className={`modals-file-upload-area ${isDragOver ? 'modals-drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleUploadClick}
          >
            <h4>选择 JSON 文件</h4>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="modals-file-input"
            />
            <p className="modals-upload-hint">点击或拖拽 JSON 文件到此处上传</p>
            {selectedFile && (
              <p className="modals-selected-file">已选择: {selectedFile.name}</p>
            )}
          </div>
          <div className="modals-modal-actions">
            <button className="modals-cancel-button" onClick={onCancel}>
              取消
            </button>
            <button
              className="modals-confirm-button"
              onClick={handleConfirmJsonImport}
              disabled={isParsing || !selectedFile}
            >
              {isParsing ? '导入中...' : '确认导入'}
            </button>
          </div>

          <div className="modals-import-divider">
            <span>或者</span>
          </div>

          <div className="modals-template-import-section">
            <button
              className="modals-template-import-button"
              onClick={handleOpenTemplateSelector}
            >
              从模板导入
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportChessModal;