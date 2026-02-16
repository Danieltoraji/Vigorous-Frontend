import { useState, useContext, createContext } from 'react';
const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {

  // A 初始化项目数据。现在是模拟数据。以后会设为空对象。
  const [projectData, setProjectData] = useState({
    'Hajimi-123456': {
      name: 'Vigorous-Test-Project',
      user: 'Hajimi',
      created_at: 'date1',
      edited_at: 'date2',
      id: 'Hajimi-123456',
      description: 'Oiiaioiiiiai',
      status: 'editable',
      feature:{
        shape: 'square',
        size: 10,
      },
      project_tags: ['type1','type2'],
    },
    'Hajimi-456789': {
      name: 'Vigorous-Test-Project',
      user: 'Hajimi',
      created_at: 'date3',
      edited_at: 'date4',
      id: 'Hajimi-456789',
      description: '第二个测试项目',
      status: 'archived',
      feature:{
        shape: 'square',
        size: 10,
      },
      project_tags: ['type3','type4'],
    },
  });

  //B 这里要写逻辑和方法，从后端获取项目数据，向后端同步数据。
  //B1 设置状态管理，包括加载中、错误、最后更新时间。默认：加载中、无错误、无最后更新时间
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  //B2 方法：获取所有组件（从后端拉取）
  const fetchProjects = async () => {
    try {
      //B21 向后端请求
      setLoading(true);
      const response = await fetch('/api/projects'); // TODO:你的后端接口地址
      if (!response.ok) throw new Error('获取项目失败');
      const data = await response.json();
      //B22 数据处理
      // 后端返回的数据格式假设是：[{ id: '...', name: '...' }, ...]
      // 要转换成你的格式：{ '项目id': { ...项目详情 } }
      const projectsMap = {};
      data.forEach(project => {
        projectsMap[project.id] = project;
      });
      //B23 传出数据，设置状态
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
  //B2' 组件加载时自动运行B2获取数据
  useEffect(() => {
      fetchProjects();
    }, []);

  //B3 方法：刷新（从后端拉取）项目数据
  const refreshProjects = () => {
    fetchProjects();
  };

  //B4 方法：创建项目（向后端发送）
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
      throw err;
    }
  };
  /*B4 使用注释
  发送到后端的请求格式
      POST /api/projects
      Content-Type: application/json
      {
        "name": "项目名称",
        "user": "用户名",
        "description": "项目描述",
        "status": "editable",
        "feature": {
          "shape": "square",
          "size": 10
        },
        "project_tags": ["type1", "type2"]
      }
  后端返回的数据格式
      {
        id: 'Hajimi-123456',           // 后端生成的唯一ID
        name: '项目名称',
        user: '用户名',
        created_at: '2024-01-01T00:00:00Z',  // 后端生成的时间戳
        edited_at: '2024-01-01T00:00:00Z',   // 后端生成的时间戳
        description: '项目描述',
        status: 'editable',
        feature: {
          shape: 'square',
          size: 10,
        },
        project_tags: ['type1', 'type2']
      }
  在添加新项目时，只需要提供新项目的详细信息，后端会生成唯一ID、创建时间、编辑时间。
  而且无需连带既有项目。
  比如：
      createProject({
        name: '新项目-2024',
        user: 'Hajimi',
        description: '这是一个新创建的项目',
        status: 'editable',
        feature: {
          shape: 'circle',
          size: 15
        },
        project_tags: ['new', 'test']
      });
*/

  //B5 方法：更新项目（向后端发送）
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

  //B6 方法：删除项目（向后端发送）
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

  // B7. 总结：提供给组件的数据和方法
  const value = {
    // 数据
    projectData,
    loading,
    error,
    lastUpdated,
    
    // 读取方法
    fetchProjects,
    refreshProjects,
    
    // 修改方法
    createProject,
    updateProject,
    deleteProject,
    
    // 如果你还想保留原始的 setProjectData（用于特殊情况）
    setProjectData
  };
  //C 这里是Context的结尾和Hook，后面是固定的。
  return (
    <ProjectContext.Provider value={{ projectData, setProjectData }}>
      {children}
    </ProjectContext.Provider>
  );
}

  //D 这里是Hook，用于在组件中使用项目数据。
export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
