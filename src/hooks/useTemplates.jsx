import { useState, useContext, createContext, useEffect } from 'react';
import csrfapi from '../utils/csrfapi.js';

const TemplatesContext = createContext(null);

export function TemplatesProvider({ children }) {
  // 初始状态
  const [templatesData, setTemplatesData] = useState({
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
      
      const url = `/presets/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await csrfapi.get(url);
      const data = response.data;
      
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
    } finally {
      setLoading(false);
    }
  };

  // 组件加载时自动获取数据
  useEffect(() => {
    fetchTemplates();
    setLoading(false);
    setError(null);
  }, []);

  // 获取单个模板
  const fetchTemplate = async (templateId) => {
    try {
      const response = await csrfapi.get(`/presets/${templateId}/`);
      const template = response.data;
      
      // 更新这个模板的数据
      setTemplatesData(prev => ({
        ...prev,
        [templateId]: template
      }));
      
      return template;
    } catch (err) {
      throw err;
    }
  };

  // 创建新模板
  const createTemplate = async (templateData) => {
    try {
      const response = await csrfapi.post('/presets/', templateData);
      const newTemplate = response.data;
      
      // 后端返回的新模板应该包含 id
      setTemplatesData(prev => ({
        ...prev,
        [newTemplate.id]: newTemplate
      }));
      
      setLastUpdated(new Date().toISOString());
      return newTemplate;
    } catch (err) {
      throw err;
    }
  };

  // 从既定的JSON中创建模板
  const createTemplateFromJson = async (templateJson) => {
    try {
      const templateData = {
        name: '新模板',
        parts: {
          "base": templateJson?.parts?.base ? JSON.parse(JSON.stringify(templateJson.parts.base)) : {
            "shape": {
              "type": "cycle",
              "size1": 15,
              "size2": 15,
              "height": 1
            },
            "customShape": {
              "profilePoints": [],
              "pathPoints": []
            },
            "material": null,
            "pattern": {
              "shape": "text",
              "position": { "x": 0, "y": 0, "z": 0 },
              "size": 10,
              "depth": 1
            },
            "edge": { "type": "none", "depth": 0 },
            "position": { "x": 0, "y": 0, "z": 0 }
          },
          "column": templateJson?.parts?.column ? JSON.parse(JSON.stringify(templateJson.parts.column)) : {
            "shape": {
              "type": "cycle",
              "size1": 10,
              "size2": 10,
              "height": 20
            },
            "customShape": {
              "profilePoints": [],
              "pathPoints": []
            },
            "material": null,
            "position": { "x": 0, "y": 0, "z": 0 },
            "sideTreatment": "none",
            "pattern": {
              "shape": "geometry",
              "geometryType": "Cube",
              "position": { "x": 0, "y": 0, "z": 0 },
              "size": 5,
              "depth": 0.5
            },
            "edge": { "type": "smooth", "depth": 0.2 }
          },
          "decoration": templateJson?.parts?.decoration ? JSON.parse(JSON.stringify(templateJson.parts.decoration)) : {
            "modelId": "0",
            "size": { "size1": 5, "size2": 5, "size3": 5 },
            "position": { "x": 0, "y": 21, "z": 0 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "material": null
          },
          "image": templateJson?.parts?.image !== undefined ? templateJson.parts.image : ""
        }
      };

      const response = await csrfapi.post('/presets/', templateData);
      const newTemplate = response.data;

      setTemplatesData(prev => ({
        ...prev,
        [newTemplate.id]: newTemplate
      }));

      setLastUpdated(new Date().toISOString());
      return newTemplate;
    } catch (err) {
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
      const response = await csrfapi.patch(`/presets/${templateId}/`, updatedData);
      
      // 后端可能返回更新后的完整数据
      const updatedFromServer = response.data;
      
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
      await csrfapi.delete(`/presets/${templateId}/`);
      
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      // 失败：恢复被删除的模板
      setTemplatesData(oldData);
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
    createTemplateFromJson,
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
