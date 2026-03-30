import React, { useState, useEffect } from 'react';
import './ProjectDetails.css';

const ProjectDetails = ({ project, onUpdate, onSave }) => {
  const [localProject, setLocalProject] = useState(project || {
    name: '',
    description: '',
    status: 'editable',
    project_tags: []
  });
  const [newTag, setNewTag] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    if (project) {
      setLocalProject(project);
    }
  }, [project]);

  const handleInputChange = (field, value) => {
    const updated = { ...localProject, [field]: value };
    setLocalProject(updated);
    onUpdate(updated);
  };

  const handleAddTag = () => {
    if (newTag && !localProject.project_tags.includes(newTag)) {
      const updatedTags = [...localProject.project_tags, newTag];
      handleInputChange('project_tags', updatedTags);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const updatedTags = localProject.project_tags.filter(tag => tag !== tagToRemove);
    handleInputChange('project_tags', updatedTags);
  };

  const handleSave = () => {
    onSave(localProject);
  };

  return (
    <>
      <button
        type="button"
        className={`project-details-edge-toggle ${isCollapsed ? 'collapsed' : 'expanded'}`}
        onClick={() => setIsCollapsed((prev) => !prev)}
        aria-label={isCollapsed ? '展开项目详情' : '折叠项目详情'}
        title={isCollapsed ? '展开项目详情' : '折叠项目详情'}
      >
        <span className="sr-only">{isCollapsed ? '展开项目详情' : '折叠项目详情'}</span>
      </button>

      <div className={`project-details ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="project-details-header">
          <h2>项目详情</h2>
        </div>

        <form className="project-details-form">
          <div className="form-group">
            <label htmlFor="project-name">项目名称</label>
            <input
              type="text"
              id="project-name"
              value={localProject.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="请输入项目名称"
            />
          </div>

          <div className="form-group">
            <label htmlFor="project-description">项目描述</label>
            <textarea
              id="project-description"
              value={localProject.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="请输入项目描述"
              rows={4}
            />
          </div>

          <div className="form-group">
            <label htmlFor="project-status">项目状态</label>
            <select
              id="project-status"
              value={localProject.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
            >
              <option value="editable">可编辑</option>
              <option value="archived">已归档</option>
              <option value="protected">受保护</option>
            </select>
          </div>

          <div className="form-group">
            <label>项目标签</label>
            <div className="tag-input-container">
              <div className="tags">
                {localProject.project_tags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                    <button
                      type="button"
                      className="tag-remove"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="tag-input-wrapper">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="添加标签"
                />
                <button
                  type="button"
                  className="add-tag-button"
                  onClick={handleAddTag}
                >
                  添加
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="form-save-button"
            onClick={handleSave}
          >
            保存项目信息
          </button>
        </form>
      </div>
    </>
  );
};

export default ProjectDetails;