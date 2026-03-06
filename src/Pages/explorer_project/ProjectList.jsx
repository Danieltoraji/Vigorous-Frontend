import ProjectItem from './ProjectItem.jsx'
import './ProjectList.css'


function ProjectList({ projects, onEditProject, onDeleteProject, onCreateProject }) {


  return (
    <div className="project-list">
      <div className="project-list-header">
        <h2>我的项目</h2>
        <button className="btn btn-primary" onClick={onCreateProject}>
          添加新项目
        </button>
      </div>

      <div className="project-grid">
        {/* 问号保证projects不存在时不报错 */}
        {projects?.map(project => (
          <ProjectItem
            key={project.id}
            project={project}
            onEditProject={onEditProject}
            onDeleteProject={onDeleteProject}
          />
        ))}
      </div>
    </div>
  )
}

export default ProjectList
