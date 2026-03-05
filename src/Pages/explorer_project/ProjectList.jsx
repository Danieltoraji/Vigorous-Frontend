import ProjectItem from './ProjectItem.jsx'
import './ProjectList.css'

function ProjectList({ projects, onEditProject }) {
  const handleAddProject = () => {
    // TODO: 实现添加新项目逻辑
  }

  return (
    <div className="project-list">
      <div className="project-list-header">
        <h2>我的项目</h2>
        <button className="btn btn-primary" onClick={handleAddProject}>
          添加新项目
        </button>
      </div>
      
      <div className="project-grid">
        {projects.map(project => (
          <ProjectItem 
            key={project.id} 
            project={project} 
            onEditProject={onEditProject} 
          />
        ))}
      </div>
    </div>
  )
}

export default ProjectList
