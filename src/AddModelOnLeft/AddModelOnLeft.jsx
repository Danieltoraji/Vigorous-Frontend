import React, { useState, useRef, useEffect } from 'react';
import './AddModelOnLeft.css';
import csrfapi from '../utils/csrfapi.js';

const AddModelOnLeft = ({ isHeaderVisible, onAddObject }) => {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isWindowMode, setIsWindowMode] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [useMockMode, setUseMockMode] = useState(true); // Mock mode toggle

  const containerRef = useRef(null);

  // Mock API delay simulation
  const mockApiCall = (shapeType) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 80% success rate for mock mode
        if (Math.random() > 0.2) {
          resolve({
            success: true,
            message: `成功创建${getShapeName(shapeType)}`,
            data: {
              id: Math.floor(Math.random() * 1000),
              shape_type: shapeType,
              created_at: new Date().toISOString()
            }
          });
        } else {
          reject(new Error('模拟API错误：服务器暂时不可用'));
        }
      }, 1500); // 1.5秒延迟模拟真实API调用
    });
  };

  // 发送模型创建请求
  const sendModelRequest = async (shapeType) => {
    setLoading(true);
    setFeedback({ type: '', message: '' });

    try {
      if (useMockMode) {
        // 使用模拟API
        console.log('使用模拟模式创建:', shapeType);
        const result = await mockApiCall(shapeType);
        setFeedback({ type: 'success', message: result.message });
        console.log('模拟请求成功:', result.data);

        // 模拟添加到场景
        if (onAddObject) {
          onAddObject({
            type: shapeType,
            position: { x: 0, y: 0, z: 0 },
            color: '#ffffff',
            ...(shapeType === 'sphere' && { radius: 1 }),
            ...(shapeType === 'box' && { width: 2, height: 2, depth: 2 }),
            ...(shapeType === 'cylinder' && { radiusTop: 1, radiusBottom: 1, height: 2, radialSegments: 32 })
          });
        }
      } else {
        // 构建请求数据
        const requestData = {
          operation: '创建形状',
          shape_type: shapeType,
          parameters: {
            ...getDefaultParameters(shapeType),
            position: { x: 0, y: 0, z: 0 },
            color: '#ffffff'
          },
          timestamp: new Date().toISOString()
        };

        console.log('发送请求到:', '/generator/');
        console.log('请求数据:', requestData);

        // 发送HTTP请求
        const response = await csrfapi.post('/generator/', requestData);
        const data = response.data;

        setFeedback({ type: 'success', message: `成功创建${getShapeName(shapeType)}` });
        console.log('请求成功:', data);

        // 添加到场景
        if (onAddObject) {
          onAddObject({
            type: shapeType,
            position: { x: 0, y: 0, z: 0 },
            color: '#ffffff',
            ...(shapeType === 'sphere' && { radius: data.parameters?.radius || 1 }),
            ...(shapeType === 'box' && {
              width: data.parameters?.width || 2,
              height: data.parameters?.height || 2,
              depth: data.parameters?.depth || 2
            }),
            ...(shapeType === 'cylinder' && {
              radiusTop: data.parameters?.radiusTop || 1,
              radiusBottom: data.parameters?.radiusBottom || 1,
              height: data.parameters?.height || 2,
              radialSegments: data.parameters?.radialSegments || 32
            })
          });
        }
      }

      // 3秒后清除反馈信息
      setTimeout(() => {
        setFeedback({ type: '', message: '' });
      }, 3000);

    } catch (error) {
      console.error('请求失败详情:', error);

      let errorMessage = '创建失败: ';

      if (error.message.includes('Network Error')) {
        errorMessage += '无法连接到服务器，请确保后端服务正在运行';
      } else if (error.response) {
        // 服务器响应了错误状态码
        errorMessage += `服务器错误: ${error.response.status} ${error.response.statusText}`;
      } else {
        errorMessage += error.message;
      }

      setFeedback({ type: 'error', message: errorMessage });

      // 提供更多调试信息
      console.group('调试信息');
      console.log('目标URL:', '/generator/');
      console.log('当前时间:', new Date().toISOString());
      console.log('浏览器:', navigator.userAgent);
      console.log('使用模拟模式:', useMockMode);
      console.groupEnd();

    } finally {
      setLoading(false);
    }
  };

  // 获取形状的默认参数
  const getDefaultParameters = (shapeType) => {
    switch (shapeType) {
      case 'sphere':
        return { radius: 1 };
      case 'box':
        return { width: 2, height: 2, depth: 2 };
      case 'cylinder':
        return { radiusTop: 1, radiusBottom: 1, height: 2, radialSegments: 32 };
      default:
        return {};
    }
  };

  // 获取形状的中文名称
  const getShapeName = (shapeType) => {
    switch (shapeType) {
      case 'sphere':
        return '球体';
      case 'box':
        return '长方体';
      case 'cylinder':
        return '圆柱';
      default:
        return '形状';
    }
  };

  // 开始拖拽
  const handleMouseDown = (e) => {
    if (!isWindowMode) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  // 拖拽过程
  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  // 结束拖拽
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 切换窗口模式
  const toggleWindowMode = () => {
    setIsWindowMode(!isWindowMode);
  };

  // 切换隐藏状态
  const toggleHide = () => {
    setIsHidden(!isHidden);
  };

  // 切换模拟模式
  const toggleMockMode = () => {
    setUseMockMode(!useMockMode);
  };

  // 组件挂载时添加事件监听器
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // 根据窗口模式调整容器类名
  const containerClasses = [
    'add-model-container',
    isWindowMode ? 'window-mode' : 'panel-mode',
    isHidden ? 'hidden' : '',
    isHeaderVisible ? '' : 'no-header'
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      style={isWindowMode ? { left: `${position.x}px`, top: `${position.y}px` } : {}}
      onMouseDown={handleMouseDown}
    >
      {/* 窗口模式下的标题栏 */}
      {isWindowMode && (
        <div className="window-title-bar">
          <span>添加模型</span>
          <div className="window-controls">
            <button onClick={toggleWindowMode} className="control-btn">□</button>
            <button onClick={toggleHide} className="control-btn">−</button>
            <button onClick={() => setIsHidden(true)} className="control-btn">×</button>
          </div>
        </div>
      )}

      {/* 内容区域 */}
      <div className="add-model-content">
        {/* 模式切换按钮 */}
        <div className="mode-toggle">
          <button
            className={`mode-btn ${useMockMode ? 'active' : ''}`}
            onClick={toggleMockMode}
          >
            模拟模式
          </button>
          <button
            className={`mode-btn ${!useMockMode ? 'active' : ''}`}
            onClick={toggleMockMode}
          >
            真实API
          </button>
        </div>

        {/* 形状按钮 */}
        <div className="shape-buttons">
          <button
            className="shape-btn sphere"
            onClick={() => sendModelRequest('sphere')}
            disabled={loading}
          >
            🟠 球体
          </button>
          <button
            className="shape-btn box"
            onClick={() => sendModelRequest('box')}
            disabled={loading}
          >
            🔷 长方体
          </button>
          <button
            className="shape-btn cylinder"
            onClick={() => sendModelRequest('cylinder')}
            disabled={loading}
          >
            🔲 圆柱
          </button>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>创建中...</span>
          </div>
        )}

        {/* 反馈信息 */}
        {feedback.message && (
          <div className={`feedback ${feedback.type}`}>
            {feedback.message}
          </div>
        )}

        {/* 面板模式下的控制按钮 */}
        {!isWindowMode && (
          <div className="panel-controls">
            <button onClick={toggleWindowMode} className="control-btn window-toggle">
              ↗ 窗口模式
            </button>
            <button onClick={toggleHide} className="control-btn hide-btn">
              {isHidden ? '显示' : '隐藏'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddModelOnLeft;