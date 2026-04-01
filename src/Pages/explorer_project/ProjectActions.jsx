import './ProjectActions.css'

function ProjectActions({ onEdit, onOpen, onDelete }) {
  return (
    <div className="project-actions">
      <button className="btn btn-secondary" onClick={onEdit}>
        编辑信息
      </button>
      <button className="btn btn-primary" onClick={onOpen}>
        打开项目
      </button>
      <button className="btn btn-danger" onClick={onDelete}>
        删除项目
      </button>
    </div>
  )
}

export default ProjectActions
