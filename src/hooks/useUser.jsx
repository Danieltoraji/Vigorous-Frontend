import { useState, useEffect, useContext, createContext, use } from 'react';
import api from '../utils/api.js';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [userData, setUserData] = useState({
    id: '31415926',
    username: 'Hajimi',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从后端获取用户数据
    api.get('/getuser/')
      .then(response => {
        setUserData(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('获取用户数据失败:', error);
        setLoading(false);
      });
  }, []);

  // 用于更新用户数据的函数，确保id和username不可修改
  const updateUserData = (updatedData) => {
    setUserData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        ...updatedData,
        id: prev.id,           // 强制保留 id
        username: prev.username // 强制保留 username
      };
    });
  };

  return (
    <UserContext.Provider value={{ userData, updateUserData }}>
      {/* 在数据加载完成前，可以选渲染加载动画，防止子组件报错 */}
      {!loading ? children : <div>Loading...</div>}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}