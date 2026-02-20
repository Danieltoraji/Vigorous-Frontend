import { useState, useContext, useEffect, createContext } from 'react';
import { useProject } from './useProject.jsx';
const ChessContext = createContext(null);

export function ChessProvider({ children }) {
  const { projectData } = useProject();

  // A 初始化棋子数据。现在是模拟数据。以后会设为空对象。
  const [chessData, setChessData] = useState({
    20001:{
      name:"测试棋子1",
      user:"Hajimi",
      created_at:"2024-01-01",
      edited_at:"2024-01-02",
      id:20001,
      project_id:"Hajimi-123456",
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
    }
  })


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
      const url = `/api/pieces/?project=${projectData['Hajimi-123456'].id}`;
      const response = await fetch(url, {
        method: 'GET',
      });
      if (!response.ok) throw new Error('获取棋子失败');
      const data = await response.json();
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
      console.error('获取棋子失败:', err);
    } finally {
      setLoading(false);
    }
  }
  //B2' 组件加载时自动运行B2获取数据
  useEffect(() => {
    fetchChess();
  }, []);

  //B3 方法：刷新（从后端拉取）棋子数据
  const refreshChess = () => {
    fetchChess();
  };

  //B4 方法：创建棋子（向后端发送）
  const createChess = async (chessData) => {
    try {
      const response = await fetch('/api/pieces/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chessData)
      });
      if (!response.ok) throw new Error('创建棋子失败');
      const newChess = await response.json();
      
      // 后端返回的新棋子应该包含 id
      setChessData(prev => ({
        ...prev,
        [newChess.id]: newChess
      }));
      
      return newChess;
    } catch (err) {
      console.error('创建棋子失败:', err);
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
      const response = await fetch(`/api/pieces/${chessId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)//这里粗暴地将所有字段都发送给后端，无论改没改
      });
      
      if (!response.ok) throw new Error('更新棋子失败');
      
      // 后端可能返回更新后的完整数据
      const updatedFromServer = await response.json();
      
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
      console.error('更新棋子失败:', err);
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
      const response = await fetch(`/api/pieces/${chessId}/`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('删除棋子失败');
      
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      // 失败：恢复被删除的棋子
      setChessData(oldData);
      console.error('删除棋子失败:', err);
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
    
    // 修改方法
    createChess,
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
