import React, { useState, useEffect } from 'react';
import '../../project_editor/components/ChessPieces/modals/modals.css';
import csrfapi from '../../../utils/csrfapi.js';

export function ApplyTemplateModal({ isOpen, onClose, presetId, presetName, projects, onApplySuccess }) {
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
            const response = await csrfapi.post(`/presets/${presetId}/apply_to_projects/`, {
                project_ids: selectedProjectIds.length > 0 ? selectedProjectIds : [],
                piece_name: pieceName.trim()
            });

            const result = response.data;

            // Call success callback with full result
            if (onApplySuccess) {
                onApplySuccess(result);
            }

            // Reset and close modal
            setSelectedProjectIds([]);
            setPieceName(presetName || '');
            onClose();
        } catch (err) {
            setError(err.message || '应用预设失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const projectsArray = Array.isArray(projects) ? projects : Object.values(projects || {});
    const allSelected = projectsArray.length > 0 && selectedProjectIds.length === projectsArray.length;

    return (
        <div className="project-editor modal-overlay" onClick={onClose}>
            <div className="chess-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="chess-modal-header">
                    <h3>应用模板</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <div className="form-group">
                        <label htmlFor="piece-name">棋子名称 *</label>
                        <input
                            id="piece-name"
                            type="text"
                            value={pieceName}
                            onChange={(e) => setPieceName(e.target.value)}
                            placeholder="输入棋子名称"
                            disabled={isLoading}
                            maxLength="200"
                        />
                        <small style={{ fontSize: '12px', color: 'var(--fluent-text-tertiary)' }}>
                            {pieceName.length}/200
                        </small>
                    </div>

                    <div className="form-group">
                        <label>选择目标项目</label>
                        {projectsArray.length === 0 ? (
                            <div style={{
                                padding: '16px',
                                textAlign: 'center',
                                backgroundColor: 'rgba(0, 0, 0, 0.03)',
                                borderRadius: 'var(--fluent-radius)',
                                color: 'var(--fluent-text-secondary)',
                                fontSize: '14px'
                            }}>
                                <p>暂无项目，应用此模板将自动创建新项目</p>
                            </div>
                        ) : (
                            <>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginBottom: '12px',
                                    paddingBottom: '8px',
                                    borderBottom: '1px solid var(--fluent-border-light)'
                                }}>
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        margin: 0
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={handleSelectAll}
                                            disabled={isLoading}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <span>{allSelected ? '取消全选' : '全选'}</span>
                                    </label>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    maxHeight: '300px',
                                    overflowY: 'auto'
                                }}>
                                    {projectsArray.map(project => (
                                        <label key={project.id} style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '8px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            padding: '8px',
                                            borderRadius: 'var(--fluent-radius)',
                                            transition: 'var(--fluent-transition)',
                                            backgroundColor: selectedProjectIds.includes(project.id) ? 'rgba(0, 120, 212, 0.1)' : 'transparent'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedProjectIds.includes(project.id)}
                                                onChange={() => handleProjectToggle(project.id)}
                                                disabled={isLoading}
                                                style={{ cursor: 'pointer', marginTop: '2px' }}
                                            />
                                            <span>
                                                {project.name}
                                                {project.description && (
                                                    <small style={{
                                                        display: 'block',
                                                        fontSize: '12px',
                                                        color: 'var(--fluent-text-tertiary)',
                                                        marginTop: '2px'
                                                    }}>
                                                        {project.description}
                                                    </small>
                                                )}
                                            </span>
                                        </label>
                                    ))}
                                </div>

                                <small style={{
                                    display: 'block',
                                    fontSize: '12px',
                                    color: 'var(--fluent-text-tertiary)',
                                    marginTop: '12px'
                                }}>
                                    {selectedProjectIds.length === 0
                                        ? '未选择项目将自动创建新项目'
                                        : `已选择 ${selectedProjectIds.length} 个项目`}
                                </small>
                            </>
                        )}
                    </div>

                    {error && (
                        <div style={{
                            color: '#D13438',
                            fontSize: '14px',
                            padding: '8px 12px',
                            backgroundColor: 'rgba(209, 52, 56, 0.1)',
                            borderRadius: 'var(--fluent-radius)',
                            marginTop: '12px'
                        }}>
                            {error}
                        </div>
                    )}
                </div>

                <div className="modal-actions">
                    <button
                        className="cancel-button"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        取消
                    </button>
                    <button
                        className="save-button"
                        disabled={isLoading || !pieceName.trim()}
                    >
                        {isLoading ? '应用中...' : '应用'}
                    </button>
                </div>
            </div>
        </div>
    );
}
