import { useState, useContext, createContext, useEffect } from 'react';

const TemplatesContext = createContext(null);

export function TemplatesProvider({ children }) {
  // 初始状态
  const [templatesData, setTemplatesData] = useState({
    30001:{
      name:"测试模板棋子1",
      user:"Hajimi",
      created_at:"2024-01-01",
      edited_at:"2024-01-02",
      id:30001,
      type:"type1",
      piece_tags:["tag1","tag2"],
      parts:{
        '1':{
          Appear:"False",
          Shape:{
            type:"Circle",
            size1:15,
            size2:15,
            height:1,
            color:"#FF0000",
            position:{
              x:0,
              y:0,
              z:0
            }
          },
          Texture:{
            file:"",
            position:{
              x:0,
              y:0,
              z:0
            },
            zoom:1,

          },
          Text:{
            content:"THU",
            size:10,
            position:{
              x:0,
              y:0,
            },
            color:"#FFFFFF",
            height:1,
          }
        },
        '2':{
          Appear:"False",
          Shape:{
            type:"Circle",
            size1:15,
            size2:15,
            height:1,
            color:"#FF0000",
            position:{
              x:0,
              y:0,
              z:0
            }
          },
          Texture:{
            file:"",
            position:{
              x:0,
              y:0,
              z:0
            },
            zoom:1,

          },
          Text:{
            content:"THU",
            size:10,
            position:{
              x:0,
              y:0,
            },
            color:"#FFFFFF",
            height:1,
          }
        },
        '3':{
          Appear:"False",
          Shape:{
            type:"Circle",
            size1:15,
            size2:15,
            height:1,
            color:"#FF0000",
            position:{
              x:0,
              y:0,
              z:0
            }
          },
          Texture:{
            file:"",
            position:{
              x:0,
              y:0,
              z:0
            },
            zoom:1,

          },
          Text:{
            content:"THU",
            size:10,
            position:{
              x:0,
              y:0,
            },
            color:"#FFFFFF",
            height:1,
          }
        },
        '4':{
          Appear:"False",
          Shape:{
            type:"Circle",
            size1:15,
            size2:15,
            height:1,
            color:"#FF0000",
            position:{
              x:0,
              y:0,
              z:0
            }
          },
          Texture:{
            file:"",
            position:{
              x:0,
              y:0,
              z:0
            },
            zoom:1,

          },
          Text:{
            content:"THU",
            size:10,
            position:{
              x:0,
              y:0,
            },
            color:"#FFFFFF",
            height:1,
          }
        },
      }
    },
  });
  
  // 状态管理：加载中、错误、最后更新时间
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // 从后端获取所有模板（预设）
  const fetchTemplates = async (params = {}) => {
    try {
      setLoading(true);
      
      // 构建查询参数
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append('search', params.search);
      if (params.ordering) queryParams.append('ordering', params.ordering);
      
      const url = `/api/presets/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error('获取模板失败');
      const data = await response.json();
      
      // 转换数据格式：{ '模板id': { ...模板详情 } }
      const templatesMap = {};
      data.forEach(template => {
        templatesMap[template.id] = template;
      });
      
      setTemplatesData(templatesMap);
      setLastUpdated(new Date().toISOString());
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('获取模板失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 组件加载时自动获取数据
  useEffect(() => {
    // 暂时禁用自动获取，使用本地模拟数据
    // fetchTemplates();
    setLoading(false);
    setError(null);
  }, []);

  // 获取单个模板
  const fetchTemplate = async (templateId) => {
    try {
      const response = await fetch(`/api/presets/${templateId}/`);
      if (!response.ok) throw new Error('获取模板详情失败');
      const template = await response.json();
      
      // 更新这个模板的数据
      setTemplatesData(prev => ({
        ...prev,
        [templateId]: template
      }));
      
      return template;
    } catch (err) {
      console.error('获取模板详情失败:', err);
      throw err;
    }
  };

  // 创建新模板
  const createTemplate = async (templateData) => {
    try {
      const response = await fetch('/api/presets/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });
      
      if (!response.ok) throw new Error('创建模板失败');
      const newTemplate = await response.json();
      
      // 后端返回的新模板应该包含 id
      setTemplatesData(prev => ({
        ...prev,
        [newTemplate.id]: newTemplate
      }));
      
      setLastUpdated(new Date().toISOString());
      return newTemplate;
    } catch (err) {
      console.error('创建模板失败:', err);
      throw err;
    }
  };

  // 更新模板
  const updateTemplate = async (templateId, updatedData) => {
    // 先保存旧值（万一失败要恢复）
    const oldData = templatesData[templateId];
    
    // 乐观更新：立即更新界面
    setTemplatesData(prev => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        ...updatedData
      }
    }));
    
    try {
      const response = await fetch(`/api/presets/${templateId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      
      if (!response.ok) throw new Error('更新模板失败');
      
      // 后端可能返回更新后的完整数据
      const updatedFromServer = await response.json();
      
      // 用后端返回的数据再次更新（确保一致）
      setTemplatesData(prev => ({
        ...prev,
        [templateId]: updatedFromServer
      }));
      
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      // 失败：恢复旧数据
      setTemplatesData(prev => ({
        ...prev,
        [templateId]: oldData
      }));
      console.error('更新模板失败:', err);
      throw err;
    }
  };

  // 删除模板
  const deleteTemplate = async (templateId) => {
    // 先保存旧值
    const oldData = { ...templatesData };
    const templateExists = templateId in templatesData;
    
    if (!templateExists) return;
    
    // 乐观更新：立即从界面移除
    setTemplatesData(prev => {
      const newData = { ...prev };
      delete newData[templateId];
      return newData;
    });
    
    try {
      const response = await fetch(`/api/presets/${templateId}/`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('删除模板失败');
      
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      // 失败：恢复被删除的模板
      setTemplatesData(oldData);
      console.error('删除模板失败:', err);
      throw err;
    }
  };

  // 手动刷新
  const refreshTemplates = () => {
    fetchTemplates();
  };

  // 提供给组件的数据和方法
  const value = {
    // 数据
    templatesData,
    loading,
    error,
    lastUpdated,
    
    // 读取方法
    getTemplate: (id) => templatesData[id],
    fetchTemplates,
    fetchTemplate,
    refreshTemplates,
    
    // 修改方法
    createTemplate,
    updateTemplate,
    deleteTemplate,
    
    // 原始的 setTemplatesData（用于特殊情况）
    setTemplatesData
  };

  return (
    <TemplatesContext.Provider value={value}>
      {children}
    </TemplatesContext.Provider>
  );
}

export function useTemplates() {
  const context = useContext(TemplatesContext);
  if (!context) {
    throw new Error('useTemplates must be used within a TemplatesProvider');
  }
  return context;
}
