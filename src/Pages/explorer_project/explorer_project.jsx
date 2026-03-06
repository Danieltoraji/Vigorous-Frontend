/**
 * 资源管理器，用于管理：
 * 项目
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../hooks/useUser.jsx'
import { useProject } from '../../hooks/useProject.jsx'
import ProjectList from './ProjectList.jsx'
import ProjectEditModal from './ProjectEditModal.jsx'
import ExplorerBottom from './ExplorerBottom.jsx'
import './explorer_project.css'

function ExplorerProject() {
  const navigate = useNavigate()
  const { userData, loading } = useUser()
  const { projectData, setProjectData, updateProject, deleteProject, createProject } = useProject()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [currentProject, setCurrentProject] = useState(null)

  const onBack = () => {
    navigate('/menu')
  }

  if (loading || !userData) {
    console.log('正在加载用户信息...')
    return <div className="loading-container">正在加载用户信息...</div>
  }

  // 从 ProjectContext 获取项目数据
  /** @type {Project<projectId: int, project: dict>: dict}  */
  // Object.values()将字典转换为数组
  const projects = Object.values(projectData || {}).map(project => {
    console.log('获取了一个项目：', project.id, project.name)
    // 返回项目详细信息
    return project || {
      id: 1,
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
        <button className="back-button" onClick={onBack}>
          ← 返回
        </button>
        <h1>项目资源管理器</h1>
        <p>欢迎您！{userData.username}</p>
      </div>

      <ProjectList
        projects={projects}
        onEditProject={handleEditProject}
        onDeleteProject={deleteProject}
        onCreateProject={createProject}
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
