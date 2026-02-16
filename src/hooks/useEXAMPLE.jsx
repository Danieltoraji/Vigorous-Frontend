/*
 * 这是DeepSeek提供的，用来实现和后端通信的文件。
 */

import { useState, useContext, createContext, useEffect } from 'react';

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  // 1. 初始状态改成空对象（等后端来填）
  const [projectData, setProjectData] = useState({});
  
  // 2. 加三个新状态：加载中、错误、最后更新时间
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // 3. 从后端获取所有项目（页面一加载就执行）
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects'); // 你的后端接口地址
      if (!response.ok) throw new Error('获取项目失败');
      const data = await response.json();
      
      // 后端返回的数据格式假设是：[{ id: '...', name: '...' }, ...]
      // 要转换成你的格式：{ '项目id': { ...项目详情 } }
      const projectsMap = {};
      data.forEach(project => {
        projectsMap[project.id] = project;
      });
      
      setProjectData(projectsMap);
      setLastUpdated(new Date().toISOString());
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('获取项目失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 4. 组件加载时自动获取数据
  useEffect(() => {
    fetchProjects();
  }, []); // 空数组，只在第一次加载时执行

  // 5. 获取单个项目（如果需要）
  const fetchProject = async (projectId) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error('获取项目详情失败');
      const project = await response.json();
      
      // 更新这个项目的数据
      setProjectData(prev => ({
        ...prev,
        [projectId]: project
      }));
    } catch (err) {
      console.error('获取项目详情失败:', err);
    }
  };

  // 6. 创建新项目
  const createProject = async (projectData) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });
      if (!response.ok) throw new Error('创建项目失败');
      const newProject = await response.json();
      
      // 后端返回的新项目应该包含 id
      setProjectData(prev => ({
        ...prev,
        [newProject.id]: newProject
      }));
      
      return newProject;
    } catch (err) {
      console.error('创建项目失败:', err);
      throw err; // 让组件知道失败了
    }
  };

  // 7. 更新项目（核心的双向通信！）
  const updateProject = async (projectId, updatedData) => {
    // 先保存旧值（万一失败要恢复）
    const oldData = projectData[projectId];
    
    // 乐观更新：立即更新界面
    setProjectData(prev => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        ...updatedData
      }
    }));
    
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      
      if (!response.ok) throw new Error('更新项目失败');
      
      // 后端可能返回更新后的完整数据
      const updatedFromServer = await response.json();
      
      // 用后端返回的数据再次更新（确保一致）
      setProjectData(prev => ({
        ...prev,
        [projectId]: updatedFromServer
      }));
      
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      // 失败：恢复旧数据
      setProjectData(prev => ({
        ...prev,
        [projectId]: oldData
      }));
      console.error('更新项目失败:', err);
      throw err;
    }
  };

  // 8. 删除项目
  const deleteProject = async (projectId) => {
    // 先保存旧值
    const oldData = { ...projectData };
    const projectExists = projectId in projectData;
    
    if (!projectExists) return;
    
    // 乐观更新：立即从界面移除
    setProjectData(prev => {
      const newData = { ...prev };
      delete newData[projectId];
      return newData;
    });
    
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('删除项目失败');
      
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      // 失败：恢复被删除的项目
      setProjectData(oldData);
      console.error('删除项目失败:', err);
      throw err;
    }
  };

  // 9. 手动刷新（用户下拉刷新时用）
  const refreshProjects = () => {
    fetchProjects();
  };

  // 10. 提供给组件的数据和方法
  const value = {
    // 数据
    projectData,
    loading,
    error,
    lastUpdated,
    
    // 读取方法
    getProject: (id) => projectData[id],
    refreshProjects,
    fetchProject,
    
    // 修改方法
    createProject,
    updateProject,
    deleteProject,
    
    // 如果你还想保留原始的 setProjectData（用于特殊情况）
    setProjectData
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

/*-------------------------------------------------------------------------------------------*/
/*
 * 这是组件中的写法。
 */
import { useProject } from './hooks/useProject'

function ProjectList() {
  // 现在 useProject 返回的东西变多了！
  const { 
    projectData,      // 所有项目
    loading,          // 是否在加载
    error,            // 错误信息
    updateProject,    // 更新项目
    createProject,    // 创建项目
    deleteProject,    // 删除项目
    refreshProjects   // 手动刷新
  } = useProject();

  // 处理加载中
  if (loading) return <div>加载中...</div>;
  
  // 处理错误
  if (error) return <div>出错了：{error}</div>;

  // 修改项目
  const handleUpdate = (id) => {
    updateProject(id, { 
      name: '新名字',
      status: '已完成' 
    });
  };

  // 创建项目
  const handleCreate = () => {
    createProject({
      name: '新项目',
      description: '描述',
      // ...其他字段
    });
  };

  return (
    <div>
      <button onClick={refreshProjects}>刷新</button>
      <button onClick={handleCreate}>新建项目</button>
      
      {Object.values(projectData).map(project => (
        <div key={project.id}>
          <h3>{project.name}</h3>
          <p>状态：{project.status}</p>
          <button onClick={() => handleUpdate(project.id)}>
            修改
          </button>
          <button onClick={() => deleteProject(project.id)}>
            删除
          </button>
        </div>
      ))}
    </div>
  );
}