import { useState, useContext, useEffect, createContext } from 'react';
import csrfapi from '../utils/csrfapi.js';

const DecorationContext = createContext(null);

export function DecorationProvider({ children }) {
  // A 初始化装饰数据
  const [decorationData, setDecorationData] = useState({});

  // B 状态管理：加载中、错误、最后更新时间
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // B1 方法：获取所有装饰（从后端拉取）
  const fetchDecorations = async () => {
    try {
      setLoading(true);
      console.log('开始获取装饰数据...');
      const response = await csrfapi.get('/decorations/');
      const data = response.data;
      
      // 数据处理：转换为字典格式
      const decorationsMap = {};
      data.forEach(decoration => {
        decorationsMap[decoration.id] = decoration;
      });
      
      setDecorationData(decorationsMap);
      setLastUpdated(new Date().toISOString());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // B2 组件加载时自动获取数据
  useEffect(() => {
    fetchDecorations();
  }, []);

  // B3 方法：刷新装饰数据
  const refreshDecorations = () => {
    fetchDecorations();
  };

  // B4 方法：上传装饰（向后端发送）
  const uploadDecoration = async (formData) => {
    try {
      const response = await csrfapi.post('/decorations/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const newDecoration = response.data;

      // 更新本地状态
      setDecorationData(prev => ({
        ...prev,
        [newDecoration.id]: newDecoration
      }));

      return newDecoration;
    } catch (err) {
      throw err;
    }
  };

  // B5 方法：更新装饰（修改装饰字段后向后端发送）
  const updateDecoration = async (decorationId, updatedData) => {
    const oldData = decorationData[decorationId];

    // 乐观更新：立即更新界面
    setDecorationData(prev => ({
      ...prev,
      [decorationId]: {
        ...prev[decorationId],
        ...updatedData
      }
    }));

    try {
      const response = await csrfapi.patch(`/decorations/${decorationId}/`, updatedData);

      // 用后端返回的数据再次更新（确保一致）
      const updatedFromServer = response.data;
      setDecorationData(prev => ({
        ...prev,
        [decorationId]: updatedFromServer
      }));

      setLastUpdated(new Date().toISOString());
    } catch (err) {
      // 失败：恢复旧数据
      setDecorationData(prev => ({
        ...prev,
        [decorationId]: oldData
      }));
      throw err;
    }
  };

  // B6 方法：删除装饰（向后端发送）
  const deleteDecoration = async (decorationId) => {
    const oldData = { ...decorationData };
    const decorationExists = decorationId in decorationData;

    if (!decorationExists) return;

    // 乐观更新：立即从界面移除
    setDecorationData(prev => {
      const newData = { ...prev };
      delete newData[decorationId];
      return newData;
    });

    try {
      await csrfapi.delete(`/decorations/${decorationId}/`);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      // 失败：恢复被删除的装饰
      setDecorationData(oldData);
      throw err;
    }
  };

  // B7 方法：获取单个装饰详情
  const getDecorationById = async (decorationId) => {
    try {
      setLoading(true);
      const response = await csrfapi.get(`/decorations/${decorationId}/`);
      const data = response.data;

      // 更新本地状态
      setDecorationData(prev => ({
        ...prev,
        [decorationId]: data
      }));

      setLastUpdated(new Date().toISOString());
      setError(null);
      return data;
    } catch (err) {
      setError(err.message);
      // 如果本地有数据，返回本地数据
      if (decorationData[decorationId]) {
        return decorationData[decorationId];
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // C 提供给子组件的数据和方法
  const value = {
    // 数据
    decorationData,
    loading,
    error,
    lastUpdated,

    // 读取方法
    fetchDecorations,
    refreshDecorations,
    getDecorationById,

    // 修改方法
    uploadDecoration,
    updateDecoration,
    deleteDecoration,

    // 原始 setDecorationData（用于特殊情况）
    setDecorationData
  };

  return (
    <DecorationContext.Provider value={value}>
      {children}
    </DecorationContext.Provider>
  );
}

// D Hook：用于在组件中使用装饰数据
export function useDecoration() {
  const context = useContext(DecorationContext);
  if (!context) {
    throw new Error('useDecoration must be used within a DecorationProvider');
  }
  return context;
}
