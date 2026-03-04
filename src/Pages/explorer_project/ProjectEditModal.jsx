import { useState, useEffect } from 'react'
import './ProjectEditModal.css'

function ProjectEditModal({ project, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: '',
    project_tags: []
  })
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    if (project) {
      const tags = Array.isArray(project.project_tags) ? [...project.project_tags] : [project.project_tags].filter(Boolean)
      setFormData({
        name: project.name,
        description: project.description,
        status: project.status,
        project_tags: tags
      })
      setTagInput(tags.join(', '))
    }
  }, [project])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleTagChange = (e) => {
    setTagInput(e.target.value)
  }

  const handleTagBlur = () => {
    const project_tags = tagInput.split(',').map(tag => tag.trim()).filter(tag => tag)
    setFormData(prev => ({
      ...prev,
      project_tags
    }))
    setTagInput(project_tags.join(', '))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onUpdate({
      ...project,
      ...formData
    })
  }

  if (!project) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>编辑项目信息</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label">项目名称</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">项目描述</label>
            <textarea
              id="description"
              name="description"
              className="form-textarea"
              value={formData.description}
              onChange={handleChange}
              rows="4"
            />
          </div>

          <div className="form-group">
            <label htmlFor="status" className="form-label">项目状态</label>
            <select
              id="status"
              name="status"
              className="form-input"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="editable">可编辑</option>
              <option value="archived">已归档</option>
              <option value="protected">锁定</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="tags" className="form-label">项目标签（用英文逗号分隔）</label>
            <input
              type="text"
              id="tags"
              name="tags"
              className="form-input"
              value={tagInput}
              onChange={handleTagChange}
              onBlur={handleTagBlur}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              保存更改
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProjectEditModal
