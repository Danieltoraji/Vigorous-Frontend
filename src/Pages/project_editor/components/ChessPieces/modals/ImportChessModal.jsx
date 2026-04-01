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
      <div className="modal-overlay">
        <div className="modal-content template-selector-modal">
          <div className="modal-header">
            <h3>从模板导入</h3>
            <button className="modal-close" onClick={handleBackToMain}>
              ×
            </button>
          </div>
          <div className="modal-body">
            {templatesLoading ? (
              <div className="loading-indicator">加载模板中...</div>
            ) : (
              <>
                <div className="template-selector-header">
                  <span className="selected-count">
                    已选择 {selectedTemplates.length} 个模板
                  </span>
                  <div className="template-selector-controls">
                    <div className="view-controls">
                      <button
                        className={`view-button ${viewMode === 'card' ? 'active' : ''}`}
                        onClick={() => setViewMode('card')}
                      >
                        卡片
                      </button>
                      <button
                        className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                      >
                        列表
                      </button>
                    </div>
                    <button 
                      className="select-all-button"
                      onClick={handleSelectAllTemplates}
                    >
                      {selectedTemplates.length === Object.keys(templatesData).length 
                        ? '取消全选' 
                        : '全选'}
                    </button>
                  </div>
                </div>
                <div className={`template-list ${viewMode === 'card' ? 'card-view' : 'list-view'}`}>
                  {Object.entries(templatesData).map(([id, template]) => (
                    <div
                      key={id}
                      className={`template-item ${selectedTemplates.includes(id) ? 'selected' : ''} ${viewMode === 'card' ? 'card-item' : 'list-item'}`}
                      onClick={() => handleTemplateToggle(id)}
                    >
                      <div className="template-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedTemplates.includes(id)}
                          onChange={() => {}}
                        />
                      </div>
                      {viewMode === 'card' ? (
                        <div className="template-card-content">
                          <h4 className="template-card-title">{template.name || `模板 ${id}`}</h4>
                          <div className="template-card-details">
                            <div className="template-card-detail">
                              <span className="detail-label">ID:</span>
                              <span className="detail-value">{id}</span>
                            </div>
                            {template.description && (
                              <div className="template-card-detail">
                                <span className="detail-label">描述:</span>
                                <span className="detail-value">{template.description}</span>
                              </div>
                            )}
                            {template.created_at && (
                              <div className="template-card-detail">
                                <span className="detail-label">创建时间:</span>
                                <span className="detail-value">{new Date(template.created_at).toLocaleString()}</span>
                              </div>
                            )}
                            {template.updated_at && (
                              <div className="template-card-detail">
                                <span className="detail-label">修改时间:</span>
                                <span className="detail-value">{new Date(template.updated_at).toLocaleString()}</span>
                              </div>
                            )}
                            {template.tags && template.tags.length > 0 && (
                              <div className="template-card-detail">
                                <span className="detail-label">标签:</span>
                                <div className="template-tags">
                                  {template.tags.map((tag, index) => (
                                    <span key={index} className="template-tag">{tag}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="template-list-content">
                          <div className="template-list-main">
                            <span className="template-list-name">{template.name || `模板 ${id}`}</span>
                            {template.description && (
                              <span className="template-list-description">{template.description}</span>
                            )}
                          </div>
                          <div className="template-list-details">
                            <span className="template-list-id">ID: {id}</span>
                            {template.created_at && (
                              <span className="template-list-date">创建: {new Date(template.created_at).toLocaleDateString()}</span>
                            )}
                            {template.updated_at && (
                              <span className="template-list-date">修改: {new Date(template.updated_at).toLocaleDateString()}</span>
                            )}
                            {template.tags && template.tags.length > 0 && (
                              <div className="template-list-tags">
                                {template.tags.map((tag, index) => (
                                  <span key={index} className="template-tag">{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {Object.keys(templatesData).length === 0 && (
                    <div className="empty-templates">暂无可用模板</div>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="modal-actions">
            <button className="cancel-button" onClick={handleBackToMain}>
              返回
            </button>
            <button
              className="confirm-button"
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
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>导入棋子</h3>
          <button className="modal-close" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div 
            className={`file-upload-area ${isDragOver ? 'drag-over' : ''}`}
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
              className="file-input"
            />
            <p className="upload-hint">点击或拖拽 JSON 文件到此处上传</p>
            {selectedFile && (
              <p className="selected-file">已选择: {selectedFile.name}</p>
            )}
          </div>
          <div className="modal-actions">
            <button className="cancel-button" onClick={onCancel}>
              取消
            </button>
            <button 
              className="confirm-button"
              onClick={handleConfirmJsonImport}
              disabled={isParsing || !selectedFile}
            >
              {isParsing ? '导入中...' : '确认导入'}
            </button>
          </div>
          
          <div className="import-divider">
            <span>或者</span>
          </div>
          
          <div className="template-import-section">
            <button 
              className="template-import-button"
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