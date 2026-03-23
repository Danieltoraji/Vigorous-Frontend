import { useState, useContext, useEffect, createContext } from 'react';
import csrfapi from '../utils/csrfapi.js';

const TextureContext = createContext(null);

export function TextureProvider({ children }) {
  // A 初始化纹理数据
  const [textureData, setTextureData] = useState({});

  // B 状态管理：加载中、错误、最后更新时间
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // B1 方法：获取所有纹理（从后端拉取）
  const fetchTextures = async () => {
    try {
      setLoading(true);
      console.log('开始获取纹理数据...');
      const response = await csrfapi.get('/textures/');
      const data = response.data;
      
      // 数据处理：转换为字典格式
      const texturesMap = {};
      data.forEach(texture => {
        texturesMap[texture.id] = texture;
      });
      
      setTextureData(texturesMap);
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
    fetchTextures();
  }, []);

  // B3 方法：刷新纹理数据
  const refreshTextures = () => {
    fetchTextures();
  };

  // B4 方法：上传纹理（向后端发送）
  const uploadTexture = async (formData) => {
    try {
      const response = await csrfapi.post('/textures/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const newTexture = response.data;

      // 更新本地状态
      setTextureData(prev => ({
        ...prev,
        [newTexture.id]: newTexture
      }));

      return newTexture;
    } catch (err) {
      throw err;
    }
  };

  // B5 方法：更新纹理（修改纹理字段后向后端发送）
  const updateTexture = async (textureId, updatedData) => {
    const oldData = textureData[textureId];

    // 乐观更新：立即更新界面
    setTextureData(prev => ({
      ...prev,
      [textureId]: {
        ...prev[textureId],
        ...updatedData
      }
    }));

    try {
      const response = await csrfapi.patch(`/textures/${textureId}/`, updatedData);

      // 用后端返回的数据再次更新（确保一致）
      const updatedFromServer = response.data;
      setTextureData(prev => ({
        ...prev,
        [textureId]: updatedFromServer
      }));

      setLastUpdated(new Date().toISOString());
    } catch (err) {
      // 失败：恢复旧数据
      setTextureData(prev => ({
        ...prev,
        [textureId]: oldData
      }));
      throw err;
    }
  };

  // B6 方法：删除纹理（向后端发送）
  const deleteTexture = async (textureId) => {
    const oldData = { ...textureData };
    const textureExists = textureId in textureData;

    if (!textureExists) return;

    // 乐观更新：立即从界面移除
    setTextureData(prev => {
      const newData = { ...prev };
      delete newData[textureId];
      return newData;
    });

    try {
      await csrfapi.delete(`/textures/${textureId}/`);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      // 失败：恢复被删除的纹理
      setTextureData(oldData);
      throw err;
    }
  };

  // B7 方法：获取单个纹理详情
  const getTextureById = async (textureId) => {
    try {
      setLoading(true);
      const response = await csrfapi.get(`/textures/${textureId}/`);
      const data = response.data;

      // 更新本地状态
      setTextureData(prev => ({
        ...prev,
        [textureId]: data
      }));

      setLastUpdated(new Date().toISOString());
      setError(null);
      return data;
    } catch (err) {
      setError(err.message);
      // 如果本地有数据，返回本地数据
      if (textureData[textureId]) {
        return textureData[textureId];
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // C 提供给子组件的数据和方法
  const value = {
    // 数据
    textureData,
    loading,
    error,
    lastUpdated,

    // 读取方法
    fetchTextures,
    refreshTextures,
    getTextureById,

    // 修改方法
    uploadTexture,
    updateTexture,
    deleteTexture,

    // 原始 setTextureData（用于特殊情况）
    setTextureData
  };

  return (
    <TextureContext.Provider value={value}>
      {children}
    </TextureContext.Provider>
  );
}

// D Hook：用于在组件中使用纹理数据
export function useTexture() {
  const context = useContext(TextureContext);
  if (!context) {
    throw new Error('useTexture must be used within a TextureProvider');
  }
  return context;
}
