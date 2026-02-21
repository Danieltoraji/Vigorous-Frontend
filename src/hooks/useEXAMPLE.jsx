/*
 * 这是DeepSeek提供的，用来实现和后端通信的文件。
 */

import { useState, useContext, useEffect, createContext } from 'react';
import api from '../utils/api.js';

// 创建Context
const ExampleContext = createContext(null);

// Provider组件
export function ExampleProvider({ children }) {
  // 状态管理
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 获取数据的方法
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 使用axios替代fetch
      const response = await api.get('/projects');
      setData(response.data);
      
    } catch (err) {
      setError(err.message);
      console.error('获取数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 获取单个项目的详细信息
  const fetchProjectDetail = async (projectId) => {
    try {
      setLoading(true);
      setError(null);
      
      // 使用axios替代fetch
      const response = await api.get(`/projects/${projectId}`);
      return response.data;
      
    } catch (err) {
      setError(err.message);
      console.error('获取项目详情失败:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 创建新项目
  const createProject = async (projectData) => {
    try {
      setLoading(true);
      setError(null);
      
      // 使用axios替代fetch
      const response = await api.post('/projects', projectData);
      const newProject = response.data;
      
      // 更新本地数据
      setData(prev => [...prev, newProject]);
      return newProject;
      
    } catch (err) {
      setError(err.message);
      console.error('创建项目失败:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 更新项目
  const updateProject = async (projectId, updatedData) => {
    try {
      setLoading(true);
      setError(null);
      
      // 使用axios替代fetch
      const response = await api.patch(`/projects/${projectId}`, updatedData);
      const updatedProject = response.data;
      
      // 更新本地数据
      setData(prev => 
        prev.map(item => 
          item.id === projectId ? updatedProject : item
        )
      );
      
      return updatedProject;
      
    } catch (err) {
      setError(err.message);
      console.error('更新项目失败:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 删除项目
  const deleteProject = async (projectId) => {
    try {
      setLoading(true);
      setError(null);
      
      // 使用axios替代fetch
      await api.delete(`/projects/${projectId}`);
      
      // 更新本地数据
      setData(prev => prev.filter(item => item.id !== projectId));
      
    } catch (err) {
      setError(err.message);
      console.error('删除项目失败:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Context值
  const value = {
    data,
    loading,
    error,
    fetchData,
    fetchProjectDetail,
    createProject,
    updateProject,
    deleteProject
  };

  return (
    <ExampleContext.Provider value={value}>
      {children}
    </ExampleContext.Provider>
  );
}

// Hook
export function useExample() {
  const context = useContext(ExampleContext);
  if (!context) {
    throw new Error('useExample must be used within an ExampleProvider');
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