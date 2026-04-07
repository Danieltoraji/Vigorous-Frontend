import React, { useState, useEffect } from 'react';
import './ApplyTemplateModal.css';
import csrfapi from '../../../utils/csrfapi.js';

export function ApplyTemplateModal({ isOpen, onClose, presetId, presetName, projects, onApplySuccess, onApply }) {
    const [selectedProjectIds, setSelectedProjectIds] = useState([]);
    const [pieceName, setPieceName] = useState(presetName || '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedProjectIds([]);
            setPieceName(presetName || '');
            setError(null);
        }
    }, [isOpen, presetName]);

    const handleProjectToggle = (projectId) => {
        setSelectedProjectIds(prev => {
            if (prev.includes(projectId)) {
                return prev.filter(id => id !== projectId);
            } else {
                return [...prev, projectId];
            }
        });
    };

    const handleSelectAll = () => {
        const projectsArray = Array.isArray(projects) ? projects : Object.values(projects || {});
        if (selectedProjectIds.length === projectsArray.length) {
            setSelectedProjectIds([]);
        } else {
            setSelectedProjectIds(projectsArray.map(p => p.id));
        }
    };

    const handleApply = async () => {
        if (!pieceName.trim()) {
            setError('棋子名称不能为空');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            let result;
            if (onApply) {
                result = await onApply(presetId, selectedProjectIds, pieceName.trim());
                if (!result?.success) {
                    setError(result?.error || '应用预设失败，请重试');
                    return;
                }
            } else {
                const response = await csrfapi.post(`/presets/${presetId}/apply_to_projects/`, {
                    project_ids: selectedProjectIds.length > 0 ? selectedProjectIds : [],
                    piece_name: pieceName.trim()
                });
                result = response.data;
            }

            // Call success callback with full result
            if (onApplySuccess) {
                onApplySuccess(result);
            }

            // Reset and close modal
            setSelectedProjectIds([]);
            setPieceName(presetName || '');
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || err.message || '应用预设失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const projectsArray = Array.isArray(projects) ? projects : Object.values(projects || {});
    const allSelected = projectsArray.length > 0 && selectedProjectIds.length === projectsArray.length;
    const pieceNameInputId = `vgr-atm-piece-name-${presetId || 'new'}`;

    return (
        <div className="vgr-atm-overlay" onClick={onClose}>
            <div className="vgr-atm-container" onClick={(e) => e.stopPropagation()}>
                <div className="vgr-atm-header">
                    <h3>应用模板</h3>
                    <button className="vgr-atm-close" onClick={onClose} aria-label="关闭">×</button>
                </div>

                <div className="vgr-atm-body">
                    <div className="vgr-atm-group">
                        <label htmlFor={pieceNameInputId}>棋子名称 *</label>
                        <input
                            id={pieceNameInputId}
                            type="text"
                            value={pieceName}
                            onChange={(e) => setPieceName(e.target.value)}
                            placeholder="输入棋子名称"
                            disabled={isLoading}
                            maxLength="200"
                        />
                        <small className="vgr-atm-char-count">
                            {pieceName.length}/200
                        </small>
                    </div>

                    <div className="vgr-atm-group">
                        <label>选择目标项目</label>
                        {projectsArray.length === 0 ? (
                            <div className="vgr-atm-empty-hint">
                                <p>暂无项目，应用此模板将自动创建新项目</p>
                            </div>
                        ) : (
                            <>
                                <div className="vgr-atm-select-all-row">
                                    <label className="vgr-atm-checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={handleSelectAll}
                                            disabled={isLoading}
                                        />
                                        <span>{allSelected ? '取消全选' : '全选'}</span>
                                    </label>
                                </div>

                                <div className="vgr-atm-project-list">
                                    {projectsArray.map(project => (
                                        <label
                                            key={project.id}
                                            className={`vgr-atm-project-item ${selectedProjectIds.includes(project.id) ? 'vgr-atm-project-item-selected' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedProjectIds.includes(project.id)}
                                                onChange={() => handleProjectToggle(project.id)}
                                                disabled={isLoading}
                                            />
                                            <span className="vgr-atm-project-title">
                                                {project.name}
                                                {project.description && (
                                                    <small className="vgr-atm-project-desc">
                                                        {project.description}
                                                    </small>
                                                )}
                                            </span>
                                        </label>
                                    ))}
                                </div>

                                <small className="vgr-atm-selection-hint">
                                    {selectedProjectIds.length === 0
                                        ? '未选择项目将自动创建新项目'
                                        : `已选择 ${selectedProjectIds.length} 个项目`}
                                </small>
                            </>
                        )}
                    </div>

                    {error && (
                        <div className="vgr-atm-error">
                            {error}
                        </div>
                    )}
                </div>

                <div className="vgr-atm-actions">
                    <button
                        className="vgr-atm-cancel-btn"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        取消
                    </button>
                    <button
                        className="vgr-atm-apply-btn"
                        onClick={handleApply}
                        disabled={isLoading || !pieceName.trim()}
                    >
                        {isLoading ? '应用中...' : '应用'}
                    </button>
                </div>
            </div>
        </div>
    );
}
