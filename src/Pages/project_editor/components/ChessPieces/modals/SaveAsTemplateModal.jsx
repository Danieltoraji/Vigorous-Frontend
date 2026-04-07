import React, { useState } from 'react';
import './modals.css';
import csrfapi from '../../../../../utils/csrfapi.js';

export function SaveAsTemplateModal({ isOpen, onClose, pieceId, pieceName, onSaveSuccess }) {
    const [templateName, setTemplateName] = useState(pieceName || '');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSave = async () => {
        if (!templateName.trim()) {
            setError('预设名称不能为空');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await csrfapi.post(`/pieces/${pieceId}/save_as_preset/`, {
                name: templateName.trim(),
                description: description.trim()
            });

            const preset = response.data;

            // Call success callback
            if (onSaveSuccess) {
                onSaveSuccess(preset);
            }

            // Reset form and close modal
            setTemplateName('');
            setDescription('');
            onClose();
        } catch (err) {
            setError(err.message || '保存预设失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="project-editor modal-overlay" onClick={onClose}>
            <div className="chess-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="chess-modal-header">
                    <h3>保存为模板</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <div className="form-group">
                        <label htmlFor="template-name">模板名称 *</label>
                        <input
                            id="template-name"
                            type="text"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder="输入模板名称"
                            disabled={isLoading}
                            maxLength="200"
                        />
                        <small style={{ fontSize: '12px', color: 'var(--fluent-text-tertiary)' }}>
                            {templateName.length}/200
                        </small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="template-desc">描述（可选）</label>
                        <textarea
                            id="template-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="输入模板描述"
                            disabled={isLoading}
                            rows="4"
                            maxLength="500"
                            style={{
                                padding: '8px 12px',
                                border: '1px solid var(--fluent-border)',
                                borderRadius: 'var(--fluent-radius)',
                                fontSize: '14px',
                                fontFamily: 'inherit',
                                backgroundColor: 'white',
                                color: 'var(--fluent-text)',
                                transition: 'var(--fluent-transition)',
                                resize: 'vertical'
                            }}
                        />
                        <small style={{ fontSize: '12px', color: 'var(--fluent-text-tertiary)' }}>
                            {description.length}/500
                        </small>
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
                        onClick={handleSave}
                        disabled={isLoading || !templateName.trim()}
                    >
                        {isLoading ? '保存中...' : '保存'}
                    </button>
                </div>
            </div>
        </div>
    );
}
