import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CatmullRomCurve3, Vector3, LatheGeometry, TubeGeometry, Shape, ExtrudeGeometry, Vector2, Float32BufferAttribute } from 'three';
import * as THREE from 'three';

// 简化的 2D 画布组件
const SimpleCanvas = ({ 
  title, 
  onPointsChange,
  equationPlaceholder,
  className = "",
  initialPoints = [] // 新增：接收初始点数据
}) => {
  const canvasRef = useRef(null);
  const [points, setPoints] = useState(initialPoints); // 使用传入的初始值
  const [isDrawing, setIsDrawing] = useState(false);
  const [equation, setEquation] = useState('');
  const isFirstRender = useRef(true); // 记录是否首次渲染

  // 当外部 initialPoints 变化时，同步更新内部状态并重新绘制
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (initialPoints && initialPoints.length > 0) {
      setPoints(initialPoints);
      // 重新绘制已有的点
      initialPoints.forEach((point, index) => {
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        if (index > 0) {
          const prevPoint = initialPoints[index - 1];
          ctx.strokeStyle = '#4ecdc4';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(prevPoint.x, prevPoint.y);
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
        }
      });
    } else {
      setPoints([]);
    }
  }, [initialPoints]);

  const drawPoint = useCallback((x, y) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const drawLine = useCallback((fromX, fromY, toX, toY) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
  }, []);

  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    // 计算缩放比例
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setIsDrawing(true);
    const newPoint = { x, y };
    setPoints([newPoint]);
    
    // 直接绘制，不依赖外部函数
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    // 计算缩放比例
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const lastPoint = points[points.length - 1];
    if (lastPoint) {
      // 直接绘制，不依赖外部函数
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#4ecdc4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    
    const newPoint = { x, y };
    setPoints(prev => [...prev, newPoint]);
  }, [isDrawing, points]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    // 绘制完成后立即触发回调
    if (onPointsChange && points.length > 0) {
      onPointsChange(points);
    }
  }, [onPointsChange, points]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPoints([]);
    setEquation('');
    
    if (onPointsChange) {
      onPointsChange([]);
    }
  }, [onPointsChange]);

  const generateFromEquation = useCallback(() => {
    if (!equation.trim()) return;
    
    try {
      const newPoints = [];
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i <= canvas.width; i += 3) {
        const normalizedX = (i / canvas.width) * 20 - 10;
        let y;
        
        try {
          y = eval(equation.replace(/x/g, `(${normalizedX})`));
          const canvasY = canvas.height / 2 - (y * 15);
          
          if (canvasY >= 0 && canvasY <= canvas.height) {
            newPoints.push({ x: i, y: canvasY });
            drawPoint(i, canvasY);
            
            if (newPoints.length > 1) {
              const prevPoint = newPoints[newPoints.length - 2];
              drawLine(prevPoint.x, prevPoint.y, i, canvasY);
            }
          }
        } catch (error) {
          console.warn('方程计算错误:', error);
        }
      }
      
      setPoints(newPoints);
      // 立即调用回调，确保数据被保存
      if (onPointsChange) {
        onPointsChange(newPoints);
      }
    } catch (error) {
      console.error('方程解析错误:', error);
    }
  }, [equation, drawPoint, drawLine, onPointsChange]);

  return (
    <div className={`simple-canvas-container ${className}`}>
      <div className="canvas-header">
        <h4>{title}</h4>
        <button className="clear-btn" onClick={clearCanvas}>清空</button>
      </div>
      
      <div className="equation-input-small">
        <input
          type="text"
          placeholder={equationPlaceholder}
          value={equation}
          onChange={(e) => setEquation(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && generateFromEquation()}
        />
        <button onClick={generateFromEquation}>生成</button>
      </div>
      
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          width={280}
          height={150}
          className="simple-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        {/* 旋转轴标识线（垂直） */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: '1px',
          backgroundColor: 'rgb(94, 25, 25)',
          pointerEvents: 'none',
          transform: 'translateX(-0.5px)'
        }} />
        {/* 基准线标识线（水平） */}
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: '1px',
          backgroundColor: 'rgb(94, 25, 25)',
          pointerEvents: 'none',
          transform: 'translateY(-0.5px)'
        }} />
      </div>
      
      <div className="points-count">
        点数：{points.length}
      </div>
    </div>
  );
};

// 3D 模型预览组件
export const ModelPreview = ({ profilePoints, pathPoints }) => {
  const geometries = useMemo(() => {
    if (!profilePoints || profilePoints.length < 3) return null;
    
    try {
      // ========== 1. 处理轮廓曲线 ==========
      // Canvas 中心点：(140, 75)
      // Canvas 坐标：x 向右为正，y 向下为正
      // 3D 坐标：x 向右为正，y 向上为正，z 向前为正
      // 转换规则：
      //   - canvasX - 140 -> 3D 的半径（距离中心线的水平距离）
      //   - -(canvasY - 75) -> 3D 的 y（高度，canvas 向下 y 增大，3D 向上 y 增大，所以取负）
      
      const profile2D = profilePoints.map(point => {
        const radius = (point.x - 140) / 8;      // 半径（可能为负，取绝对值）
        const height = -(point.y - 75) / 8;      // 高度
        return { radius: Math.abs(radius), height };
      });
      
      // 计算轮廓曲线的最高点
      let maxY = -Infinity;
      let minY = Infinity;
      for (const point of profile2D) {
        maxY = Math.max(maxY, point.height);
        minY = Math.min(minY, point.height);
      }
      
      // ========== 2. 处理路径曲线 ==========
      const hasPath = pathPoints && pathPoints.length >= 3;
      
      if (hasPath) {
        // ========== 扫掠异形生成逻辑（新增） ==========
        // 几何定义：
        //   轮廓曲线：在 (m,n) 坐标系中定义的曲线，用于控制三维物体的径向截面形状
        //   路径曲线：在 (x,y) 坐标系中定义的曲线，用于控制三维物体的延伸轨迹
        // 映射规则：将轮廓曲线沿路径曲线生成三维几何体
        //   X = (1 + m) * x
        //   Y = n
        //   Z = (1 + m) * z
        // 其中：(m,n) 为轮廓曲线上的点，(x,y) 为路径曲线上的点，(X,Y,Z) 为三维空间中的对应顶点
        
        // 关键代码标注：轮廓 - 路径映射实现
        const profile3D = profilePoints.map(point => {
          // 轮廓曲线坐标转换 (canvas -> (m,n))
          const m = (point.x - 140) / 140;      // 归一化半径因子，范围 [-1, 1]
          const n = (point.y - 75) / 8;         // 高度
          return { m, n };
        });
        
        // 路径曲线坐标转换 (canvas -> (x,z))
        const path3D = pathPoints.map(point => {
          const x = (point.x - 140) / 8;   // canvas x -> 3D x
          const z = -(point.y - 75) / 8;   // canvas y -> 3D z
          return { x, z };
        });
        
        // 关键代码标注：顶点计算
        // 创建扫掠几何体的顶点
        const vertices = [];
        const profileSteps = profile3D.length;
        const pathSteps = path3D.length;
                    
        // 沿着路径曲线的每个点
        for (let i = 0; i < pathSteps; i++) {
          const pathPoint = path3D[i];
                      
          // 在路径点上应用轮廓曲线的缩放
          for (let j = 0; j < profileSteps; j++) {
            const profilePoint = profile3D[j];
            // 缩放因子 肉眼观测得出。
            const factor = 2;
            // 应用映射规则：X=m*x, Y=n, Z=m*z
            const X = factor * profilePoint.m * pathPoint.x;
            const Y = factor * (-profilePoint.n);
            const Z = factor * profilePoint.m * pathPoint.z;
                        
            vertices.push(new Vector3(X, Y, Z));
          }
        }
        
        // 关键代码标注：参数绑定
        // 使用计算出的顶点直接构建 BufferGeometry
        const positions = [];
        const indices = [];
        
        // 填充顶点位置
        for (const vertex of vertices) {
          positions.push(vertex.x, vertex.y, vertex.z);
        }
        
        // 构建索引（连接顶点形成面）
        // 每个路径点对应 profileSteps 个轮廓点
        for (let i = 0; i < pathSteps - 1; i++) {
          for (let j = 0; j < profileSteps - 1; j++) {
            const a = i * profileSteps + j;
            const b = i * profileSteps + (j + 1);
            const c = (i + 1) * profileSteps + j;
            const d = (i + 1) * profileSteps + (j + 1);
            
            // 两个三角形组成一个四边形
            indices.push(a, b, c);
            indices.push(c, b, d);
          }
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        // 计算路径中心点（用于后续可能的底面定位）
        let pathCenterX = 0;
        let pathCenterZ = 0;
        for (const point of path3D) {
          pathCenterX += point.x;
          pathCenterZ += point.z;
        }
        pathCenterX /= path3D.length;
        pathCenterZ /= path3D.length;
        
        return {
          sweep: geometry,
          bottomY: minY,
          topY: maxY,
          centerX: pathCenterX,
          centerZ: pathCenterZ,
          vertices: vertices
        };
        
      } else {
        // 没有路径曲线：使用旋转体（绕 Y 轴旋转）
        const profile3D = profile2D.map(p => 
          new Vector3(p.radius, p.height, 0)
        );
        
        return {
          main: new LatheGeometry(
            profile3D,
            64,
            0,
            Math.PI * 2
          )
        };
      }
    } catch (error) {
      console.error('几何体生成错误:', error);
      return null;
    }
  }, [profilePoints, pathPoints]);
  
  if (!geometries) return null;
  
  // 如果有路径曲线（扫掠异形）
  if (geometries.sweep) {
    return (
      <group>
        {/* 扫掠异形 - 轮廓曲线沿路径曲线扫掠 */}
        <mesh castShadow receiveShadow>
          <primitive object={geometries.sweep} />
          <meshStandardMaterial 
            color="#4ecdc4" 
            wireframe={false}
            metalness={0.5}
            roughness={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
        
        {/* 调试辅助：显示顶点（可选） */}
        {/* geometries.vertices && geometries.vertices.map((vertex, idx) => (
          <mesh key={idx} position={vertex}>
            <sphereGeometry args={[0.1]} />
            <meshBasicMaterial color="red" />
          </mesh>
        )) */}
      </group>
    );
  }
  
  // 如果有路径曲线（旧版挤压，保留兼容性）
  if (geometries.solid) {
    return (
      <group>
        {/* 实心体 - 轮廓曲线沿路径挤压 */}
        <mesh castShadow receiveShadow>
          <primitive object={geometries.solid} />
          <meshStandardMaterial 
            color="#ff6b6b" 
            wireframe={false}
            metalness={0.5}
            roughness={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    );
  }
  
  // 如果没有路径曲线（只有旋转体）
  if (geometries.main) {
    return (
      <mesh castShadow receiveShadow>
        <primitive object={geometries.main} />
        <meshStandardMaterial 
          color="#4ecdc4" 
          wireframe={false}
          metalness={0.5}
          roughness={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  }
  
  return null;
};

// 集成到棋子编辑器的简化版本
const CustomRevolutionGenerator = ({ currentChess, selectedComponent, handleDataUpdate }) => {
  // 直接从棋子数据中获取自定义形状数据，不使用内部状态
  const currentCustomShape = selectedComponent === 'base' 
    ? currentChess?.components?.base?.customShape 
    : currentChess?.components?.column?.customShape;
  
  const profilePoints = currentCustomShape?.profilePoints || [];
  const pathPoints = currentCustomShape?.pathPoints || [];

  // 当数据发生变化时通知父组件
  const handleProfileChange = useCallback((points) => {
    // 直接更新棋子数据
    if (handleDataUpdate) {
      handleDataUpdate(`components.${selectedComponent}.customShape.profilePoints`, points);
    }
  }, [selectedComponent, handleDataUpdate]);

  const handlePathChange = useCallback((points) => {
    // 直接更新棋子数据
    if (handleDataUpdate) {
      handleDataUpdate(`components.${selectedComponent}.customShape.pathPoints`, points);
    }
  }, [selectedComponent, handleDataUpdate]);

  return (
    <div className="custom-revolution-scroll-container">
      <div className="custom-revolution-panel">
        <div className="panel-section">
          <h3>异形生成器</h3>
          <p className="panel-description">绘制轮廓曲线生成自定义 3D 形状</p>
        </div>
        
        <div className="canvases-row">
          <SimpleCanvas
            title="轮廓曲线"
            onPointsChange={handleProfileChange}
            equationPlaceholder="例如：2*Math.sin(x)+1"
            className="profile-canvas"
            initialPoints={profilePoints}
          />
                  
          <SimpleCanvas
            title="路径曲线 (可选)"
            onPointsChange={handlePathChange}
            equationPlaceholder="例如：Math.cos(x)"
            className="path-canvas"
            initialPoints={pathPoints}
          />
        </div>
      </div>
    </div>
  );
};

export default CustomRevolutionGenerator;