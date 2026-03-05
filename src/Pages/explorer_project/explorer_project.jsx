/**
 * 资源管理器，用于管理：
 * 项目
 */
import { useState } from 'react'
import { useUser } from '../../hooks/useUser.jsx'
import { useProject } from '../../hooks/useProject.jsx'
import ProjectList from './ProjectList.jsx'
import ProjectEditModal from './ProjectEditModal.jsx'
import ExplorerBottom from './ExplorerBottom.jsx'
import './explorer_project.css'

function ExplorerProject() {
  const { userData } = useUser()
  const { projectData, setProjectData, updateProject } = useProject()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [currentProject, setCurrentProject] = useState(null)
  
  // 从 ProjectContext 获取项目数据
  const projects = userData.projects.map(projectId => {
    // 根据 projectId 从 ProjectContext 获取详细信息
    return projectData[projectId] || {
      id: projectId,
      name: '未知项目',
      description: '暂无描述',
      user: '未知',
      created_at: '无数据',
      edited_at: '无数据',
      status: '无数据',
      project_tags: []
    }
  })

  const handleEditProject = (project) => {
    setCurrentProject(project)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setCurrentProject(null)
  }

  const handleUpdateProject = async (updatedProject) => {
    try {
      // 调用 updateProject 方法向后端同步数据
      await updateProject(updatedProject.id, updatedProject)
      setIsEditModalOpen(false)
      setCurrentProject(null)
    } catch (error) {
      alert('更新失败，请重试')
    }
  }

  return (
    <div className="explorer-project">
      <div className="explorer-header">
        <h1>项目资源管理器</h1>
        <p>欢迎您！{userData.username}</p>
      </div>
      
      <ProjectList 
        projects={projects} 
        onEditProject={handleEditProject} 
      />
      
      {isEditModalOpen && currentProject && (
        <ProjectEditModal 
          project={currentProject} 
          onClose={handleCloseEditModal} 
          onUpdate={handleUpdateProject} 
        />
      )}
      
      <ExplorerBottom />
    </div>
  )
}
export default ExplorerProject
