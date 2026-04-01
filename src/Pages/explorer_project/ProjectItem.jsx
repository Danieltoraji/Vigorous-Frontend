import ProjectActions from './ProjectActions.jsx'
import { useNavigate } from 'react-router-dom'
import './ProjectItem.css'

function ProjectItem({ project, onEditProject, onDeleteProject }) {
  const navigate = useNavigate()

  const handleOpenProject = () => {
    // 导航到项目编辑器页面，并使用url传递项目ID
    navigate(`/project-editor/${project.id}`);
  }
  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString || dateString === '无数据') return '无数据';

    try {
      const date = new Date(dateString);
      // 检查日期是否有效
      if (isNaN(date.getTime())) return dateString;


      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="project-item">
      <div className="project-item-header">
        <h3 className="project-name">{project.name}</h3>
        <span className="project-status">{project.status}</span>
      </div>

      <div className="project-item-body">
        <p className="project-description">{project.description || "暂无描述"}</p>

        <div className="project-meta">
          <div className="project-meta-item">
            <span className="meta-label">项目ID：</span>
            <span className="meta-value">{project.id}</span>
          </div>
          <div className="project-meta-item">
            <span className="meta-label">创建时间：</span>
            <span className="meta-value">{formatDate(project.created_at)}</span>
          </div>
          <div className="project-meta-item">
            <span className="meta-label">修改时间：</span>
            <span className="meta-value">{formatDate(project.edited_at)}</span>
          </div>
        </div>

        <div className="project-tags">
          {
            Array.isArray(project.project_tags) ? (
              project.project_tags.map((tag, index) => (
                <span key={index} className="project-tag">{tag}</span>
              ))
            ) : (
              <span className="project-tag">无标签</span>
            )

          }

        </div>
      </div>

      <div className="project-item-footer">
        <ProjectActions
          onEdit={() => onEditProject(project)}
          onOpen={handleOpenProject}
          onDelete={() => onDeleteProject(project.id)}
        />
      </div>
    </div>
  )
}

export default ProjectItem
