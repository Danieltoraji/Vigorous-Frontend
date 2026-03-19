import { useState, useContext, useEffect, createContext, useCallback } from 'react';
import csrfapi from '../utils/csrfapi.js';
import { useProject } from './useProject.jsx';

const ChessContext = createContext(null);

export function ChessProvider({ children }) {
  const { projectData } = useProject();
  // A 初始化棋子数据。现在是模拟数据。以后会设为空对象。
  const [chessData, setChessData] = useState({});

  //B 这里要写逻辑和方法，从后端获取棋子数据，向后端同步数据。
  //B1 设置状态管理，包括加载中、错误、最后更新时间。默认：加载中、无错误、无最后更新时间
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  //B2 方法：获取所有棋子（从后端拉取）
  const fetchChess = async (params = {}) => {
    try {
      //B21 向后端请求
      setLoading(true);
      const response = await csrfapi.get(`/pieces`);
      const data = response.data;
      //B22 数据处理
      // 后端返回的数据格式假设是：[{ id: '...', name: '...' }, ...]
      // 要转换成你的格式：{ '棋子id': { ...棋子详情 } }
      const chessMap = {};
      data.forEach(chess => {
        chessMap[chess.id] = chess;
      });
      //B23 传出数据，设置状态
      setChessData(chessMap);
      setLastUpdated(new Date().toISOString());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  //B2.1 方法：按项目获取棋子列表
  const getPiecesByProject = useCallback(async (projectId, filters = {}) => {
    try {
      setLoading(true);

      // 使用 Axios 的 params 对象，它会自动处理 URL 编码，比 URLSearchParams 更简洁
      const response = await csrfapi.get('/pieces/', {
        params: {
          project: projectId,
          type: filters.type,
          tags: filters.tags, // Axios 支持数组转换
          sort_by: filters.sortBy,
          sort_order: filters.sortOrder,
          page: filters.page,
          page_size: filters.pageSize
        }
      });

      const data = response.data;

      // 处理数据
      const chessMap = {};
      data.forEach(chess => {
        chessMap[chess.id] = chess;
      });

      setChessData(chessMap);
      setLastUpdated(new Date().toISOString());
      setError(null);
      return data;
    } catch (err) {
      setError(err.message);
      // 过滤本地数据作为 fallback
      const filteredData = Object.values(chessData).filter(piece => piece.project_id === projectId);
      return filteredData;
    } finally {
      setLoading(false);
    }
  }, [])
  //B2' 组件加载时自动运行B2获取数据
  useEffect(() => {
    // fetchChess();  
    // 先只获取指定项目的棋子
  }, []);

  //B3 方法：刷新（从后端拉取）棋子数据
  const refreshChess = () => {
    // fetchChess();
    // 先只获取指定项目的棋子
  };

  //B3.5 根据棋子id获取数据
  // 由于刷新会掉state，故考虑将信息存储在url
  const getChessById = async (chessId) => {
    const response = await csrfapi.get(`/pieces/${chessId}/`);
    return response.data;
  };

  //B4 方法：创建棋子（向后端发送）
  const createChess = async (projectId) => {
    try {
      const chessData = {
        name: '新棋子',
        project: projectId,
        parts: {
          "base": {
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
              "position": { "x": 0, "y":0, "z": 0 },
              "size": 10,
              "depth": 1
            },
            "edge": { "type": "none", "depth": 0 },
            "position": { "x": 0, "y": 0, "z": 0 }
          },
          "column": {
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
              "geometryType":"Cube",
              "position": { "x": 0, "y": 0, "z": 0 },
              "size": 5,
              "depth": 0.5
            },
            "edge": { "type": "smooth", "depth": 0.2 }
          },
          "decoration": {
            "modelId": "0",
            "size": { "size1": 5, "size2": 5, "size3": 5 },
            "position": { "x": 0, "y": 21, "z": 0 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "material": null
          },
          "image": ""
        }
      }
      const response = await csrfapi.post('/pieces/', chessData);
      const newChess = response.data;

      // 后端返回的新棋子应该包含 id
      setChessData(prev => ({
        ...prev,
        [newChess.id]: newChess
      }));

      return newChess;
    } catch (err) {
      throw err;
    }
  };
  //B4' 方法：从既定的JSON中创建棋子
  const createChessFromJson = async (projectId, chessJson) => {
    console.log(chessJson)
    try {
      const chessData = {
        name: '新棋子',
        project: projectId,
        parts: {
          "base": chessJson?.parts?.base ? JSON.parse(JSON.stringify(chessJson.parts.base)) : {
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
          "column": chessJson?.parts?.column ? JSON.parse(JSON.stringify(chessJson.parts.column)) : {
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
          "decoration": chessJson?.parts?.decoration ? JSON.parse(JSON.stringify(chessJson.parts.decoration)) : {
            "modelId": "0",
            "size": { "size1": 5, "size2": 5, "size3": 5 },
            "position": { "x": 0, "y": 21, "z": 0 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "material": null
          },
          "image": chessJson?.parts?.image !== undefined ? chessJson.parts.image : ""
        }
      };

      const response = await csrfapi.post('/pieces/', chessData);
      const newChess = response.data;

      setChessData(prev => ({
        ...prev,
        [newChess.id]: newChess
      }));

      return newChess;
    } catch (err) {
      throw err;
    }
  };
  //B5 方法：更新棋子（修改棋子字段后向后端发送）
  const updateChess = async (chessId, updatedData) => {
    // 先保存旧值（万一失败要恢复）
    const oldData = chessData[chessId];

    // 乐观更新：立即更新界面
    setChessData(prev => ({
      ...prev,
      [chessId]: {
        ...prev[chessId],
        ...updatedData
      }
    }));

    try {
      const response = await csrfapi.patch(`/pieces/${chessId}/`, updatedData);

      // 后端可能返回更新后的完整数据
      const updatedFromServer = response.data;

      // 用后端返回的数据再次更新（确保一致）
      setChessData(prev => ({
        ...prev,
        [chessId]: updatedFromServer
      }));

      setLastUpdated(new Date().toISOString());
    } catch (err) {
      // 失败：恢复旧数据
      setChessData(prev => ({
        ...prev,
        [chessId]: oldData
      }));
      throw err;
    }
  };

  //B6 方法：删除棋子（向后端发送）
  const deleteChess = async (chessId) => {
    // 先保存旧值
    const oldData = { ...chessData };
    const chessExists = chessId in chessData;

    if (!chessExists) return;

    // 乐观更新：立即从界面移除
    setChessData(prev => {
      const newData = { ...prev };
      delete newData[chessId];
      return newData;
    });

    try {
      await csrfapi.delete(`/pieces/${chessId}/`);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      // 失败：恢复被删除的棋子
      setChessData(oldData);
      throw err;
    }
  };

  // B7. 总结：提供给组件的数据和方法
  const value = {
    // 数据
    chessData,
    loading,
    error,
    lastUpdated,

    // 读取方法
    fetchChess,
    refreshChess,
    getChessById,
    getPiecesByProject,

    // 修改方法
    createChess,
    createChessFromJson,
    updateChess,
    deleteChess,

    // 如果你还想保留原始的 setChessData（用于特殊情况）
    setChessData
  };
  //C 这里是Context的结尾和Hook，后面是固定的。
  return (
    <ChessContext.Provider value={value}>
      {children}
    </ChessContext.Provider>
  );
}

//D 这里是Hook，用于在组件中使用棋子数据。
export function useChess() {
  const context = useContext(ChessContext);
  if (!context) {
    throw new Error('useChess must be used within a ChessProvider');
  }
  return context;
}