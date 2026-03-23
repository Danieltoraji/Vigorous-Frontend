import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Vector3, LatheGeometry, Float32BufferAttribute } from 'three';
import * as THREE from 'three';
import { createPortal } from 'react-dom';
import './CustomRevolutionGenerator.css';

// 工具类型
const TOOL_TYPES = {
  POINT: 'point',    // 简单点绘
  BEZIER: 'bezier', // 贝塞尔曲线（带手柄）
  FREE: 'free'      // 自由绘制
};

// 生成唯一ID - 基于现有点的最大ID + localStorage，确保跨页面刷新后继续编号
const STORAGE_KEY = 'customRevolutionIdCounter';

const getStoredIdCounter = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
};

const setStoredIdCounter = (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, value.toString());
  } catch {
    // 忽略存储错误
  }
};

let idCounter = getStoredIdCounter();
const initializeIdCounter = (controlPoints) => {
  let maxId = idCounter;
  if (controlPoints && Array.isArray(controlPoints)) {
    for (const point of controlPoints) {
      if (point && typeof point.id === 'number' && point.id > maxId) {
        maxId = point.id;
      }
    }
  }
  idCounter = maxId;
  setStoredIdCounter(maxId);
};
const generateId = () => {
  idCounter = idCounter + 1;
  setStoredIdCounter(idCounter);
  return idCounter;
};

// 从控制点数组生成曲线点（用于3D生成和小窗口显示）- 不插值版本
// 直接使用控制点，不进行贝塞尔曲线插值
const generateCurvePoints = (controlPoints) => {
  if (!controlPoints || !Array.isArray(controlPoints) || controlPoints.length < 2) return [];

  const curvePoints = [];

  for (let i = 0; i < controlPoints.length; i++) {
    const point = controlPoints[i];

    // 安全检查
    if (!point || !point.pos || !point.pos[0] || !point.pos[1]) continue;
    if (typeof point.pos[0] !== 'number' || typeof point.pos[1] !== 'number') continue;
    if (isNaN(point.pos[0]) || isNaN(point.pos[1])) continue;

    curvePoints.push({ x: point.pos[0], y: point.pos[1] });
  }

  return curvePoints;
};

// 从控制点数组生成曲线点（带贝塞尔插值）- 用于平滑显示
// 注意：这个函数只用于绘制显示，不用于 3D 模型生成
// centerX: 中心线 X 坐标，用于生成镜像
// showMirror: 是否显示镜像
const generateSmoothCurvePoints = (controlPoints, centerX = 600, showMirror = false) => {
  if (!controlPoints || !Array.isArray(controlPoints) || controlPoints.length < 2) return [];

  const curvePoints = [];
  const mirrorPoints = [];
  // 降低采样密度，从 20 降到 10，显著提升性能
  const segmentsPerSpan = 10;

  for (let i = 0; i < controlPoints.length - 1; i++) {
    const p0 = controlPoints[i];
    const p1 = controlPoints[i + 1];

    if (!p0 || !p1 || !p0.pos || !p1.pos) continue;
    if (typeof p0.pos[0] !== 'number' || typeof p0.pos[1] !== 'number') continue;
    if (typeof p1.pos[0] !== 'number' || typeof p1.pos[1] !== 'number') continue;

    if (p0.type === 'bezier' && p0.handlepos && p0.handlepos.length >= 4) {
      const cp1x = p0.handlepos[2];
      const cp1y = p0.handlepos[3];
      const cp2x = (p1.handlepos && p1.handlepos.length >= 2) ? p1.handlepos[0] : p1.pos[0];
      const cp2y = (p1.handlepos && p1.handlepos.length >= 2) ? p1.handlepos[1] : p1.pos[1];

      if (typeof cp1x !== 'number' || typeof cp1y !== 'number' ||
        typeof cp2x !== 'number' || typeof cp2y !== 'number' ||
        isNaN(cp1x) || isNaN(cp1y) || isNaN(cp2x) || isNaN(cp2y)) {
        curvePoints.push({ x: p0.pos[0], y: p0.pos[1] });
        if (showMirror) {
          mirrorPoints.push({ x: 2 * centerX - p0.pos[0], y: p0.pos[1] });
        }
        if (i === controlPoints.length - 2) {
          curvePoints.push({ x: p1.pos[0], y: p1.pos[1] });
          if (showMirror) {
            mirrorPoints.push({ x: 2 * centerX - p1.pos[0], y: p1.pos[1] });
          }
        }
        continue;
      }

      // 优化：预先计算常用值
      const dx = p1.pos[0] - p0.pos[0];
      const dy = p1.pos[1] - p0.pos[1];
      
      for (let t = 0; t <= segmentsPerSpan; t++) {
        const ratio = t / segmentsPerSpan;
        const invRatio = 1 - ratio;
        const invRatio2 = invRatio * invRatio;
        const invRatio3 = invRatio2 * invRatio;
        const ratio2 = ratio * ratio;
        const ratio3 = ratio2 * ratio;

        const x = invRatio3 * p0.pos[0] +
          3 * invRatio2 * ratio * cp1x +
          3 * invRatio * ratio2 * cp2x +
          ratio3 * p1.pos[0];

        const y = invRatio3 * p0.pos[1] +
          3 * invRatio2 * ratio * cp1y +
          3 * invRatio * ratio2 * cp2y +
          ratio3 * p1.pos[1];

        if (!isNaN(x) && !isNaN(y)) {
          curvePoints.push({ x, y });
          if (showMirror) {
            mirrorPoints.push({ x: 2 * centerX - x, y });
          }
        }
      }
    } else if (p0.type === 'free') {
      curvePoints.push({ x: p0.pos[0], y: p0.pos[1] });
      if (showMirror) {
        mirrorPoints.push({ x: 2 * centerX - p0.pos[0], y: p0.pos[1] });
      }
      if (i === controlPoints.length - 2) {
        curvePoints.push({ x: p1.pos[0], y: p1.pos[1] });
        if (showMirror) {
          mirrorPoints.push({ x: 2 * centerX - p1.pos[0], y: p1.pos[1] });
        }
      }
    } else {
      curvePoints.push({ x: p0.pos[0], y: p0.pos[1] });
      if (showMirror) {
        mirrorPoints.push({ x: 2 * centerX - p0.pos[0], y: p0.pos[1] });
      }
      if (i === controlPoints.length - 2) {
        curvePoints.push({ x: p1.pos[0], y: p1.pos[1] });
        if (showMirror) {
          mirrorPoints.push({ x: 2 * centerX - p1.pos[0], y: p1.pos[1] });
        }
      }
    }
  }

  const filteredPoints = curvePoints.filter(p => !isNaN(p.x) && !isNaN(p.y));
  const filteredMirror = showMirror ? mirrorPoints.filter(p => !isNaN(p.x) && !isNaN(p.y)) : [];

  return showMirror ? { curvePoints: filteredPoints, mirrorPoints: filteredMirror } : filteredPoints;
};

// 小窗口组件 - 只显示曲线，不显示控制元素，带镜像显示
const PreviewCanvas = ({ controlPoints, title, onCurveChange }) => {
  const canvasRef = useRef(null);
  // 全屏编辑器使用的尺寸
  const sourceDimensions = { width: 1200, height: 675 };
  // 预览画布的尺寸
  const previewDimensions = { width: 280, height: 150 };
  // 中心 X 坐标（预览画布中）
  const previewCenterX = previewDimensions.width / 2;

  // 计算缩放比例
  const scaleX = previewDimensions.width / sourceDimensions.width;
  const scaleY = previewDimensions.height / sourceDimensions.height;
  const sourceCenterX = sourceDimensions.width / 2;

  // 生成并缩放曲线点 - 使用平滑曲线（贝塞尔插值），用于显示扫掠生成几何体的实际点列
  const curvePoints = useMemo(() => {
    // 带镜像生成
    return generateSmoothCurvePoints(controlPoints, sourceCenterX, true);
  }, [controlPoints, sourceCenterX]);

  // 通知父组件曲线点变化（使用 debounced 避免频繁更新）
  useEffect(() => {
    if (onCurveChange) {
      const points = curvePoints.curvePoints || curvePoints;
      // 使用 requestAnimationFrame 延迟更新，避免阻塞渲染
      requestAnimationFrame(() => {
        onCurveChange(points);
      });
    }
  }, [curvePoints, onCurveChange]);

  // 绘制曲线 - 直接用直线连接所有点，显示模型截面真实形状（包括镜像）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, previewDimensions.width, previewDimensions.height);

    // 获取曲线数据
    const curveData = curvePoints;
    const originalPoints = curveData.curvePoints || curveData;
    const mirrorPoints = curveData.mirrorPoints;

    // 如果没有原始点，直接返回
    if (!originalPoints || originalPoints.length < 2) return;

    // 1. 先绘制镜像曲线（右侧）
    if (mirrorPoints && mirrorPoints.length >= 2) {
      ctx.strokeStyle = 'rgba(78, 205, 196, 0.4)'; // 淡色镜像
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]); // 虚线
      ctx.beginPath();
      const firstMirror = mirrorPoints[0];
      ctx.moveTo(firstMirror.x * scaleX, firstMirror.y * scaleY);
      for (let i = 1; i < mirrorPoints.length; i++) {
        ctx.lineTo(mirrorPoints[i].x * scaleX, mirrorPoints[i].y * scaleY);
      }
      ctx.stroke();
      ctx.setLineDash([]); // 重置
    }

    // 2. 绘制原始曲线（左侧）
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(originalPoints[0].x * scaleX, originalPoints[0].y * scaleY);

    for (let i = 1; i < originalPoints.length; i++) {
      ctx.lineTo(originalPoints[i].x * scaleX, originalPoints[i].y * scaleY);
    }
    ctx.stroke();
  }, [curvePoints, previewDimensions, scaleX, scaleY]);

  return (
    <div className="preview-canvas-container">
      <div className="canvas-header">
        <h4>{title}</h4>
        <span className="points-count">曲线点：{(curvePoints.curvePoints || curvePoints).length}</span>
      </div>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          width={previewDimensions.width}
          height={previewDimensions.height}
          style={{ background: '#f5f5f5', borderRadius: '4px' }}
        />
        {/* 中心参考线 */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: '1px',
          backgroundColor: 'rgba(0,0,0,0.1)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: '1px',
          backgroundColor: 'rgba(0,0,0,0.1)',
          pointerEvents: 'none'
        }} />
      </div>
    </div>
  );
};

// 大窗口绘制逻辑
const FullscreenEditor = ({
  controlPoints,
  onControlPointsChange,
  title,
  readOnly = false
}) => {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState(TOOL_TYPES.POINT); // 默认使用点绘
  const [points, setPoints] = useState(controlPoints || []);
  const [selectedPointId, setSelectedPointId] = useState(null);
  const [dragState, setDragState] = useState({ isDragging: false, type: null, id: null, handle: null });
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const isInternalUpdate = useRef(false); // 标记是否内部更新
  const onControlPointsChangeRef = useRef(onControlPointsChange); // 使用 ref 避免无限循环

  // 保持 ref 更新
  useEffect(() => {
    onControlPointsChangeRef.current = onControlPointsChange;
  }, [onControlPointsChange]);

  // 固定长宽比为 16:9，保持合理比例
  const dimensions = { width: 1200, height: 675 };
  // 中心X坐标
  const centerX = dimensions.width / 2;

  // 使用 isDraggingRef 来避免在拖动时触发同步
  const isDraggingRef = useRef(false);

  // 初始化ID计数器 - 基于现有控制点的最大ID（只在挂载时执行一次）
  useEffect(() => {
    initializeIdCounter(controlPoints);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当 controlPoints prop 变化时，同步到组件状态（只在非内部更新时，且不在拖动时）
  useEffect(() => {
    if (!isInternalUpdate.current && !isDraggingRef.current && controlPoints) {
      // 比较数组是否不同
      const isDifferent = JSON.stringify(controlPoints) !== JSON.stringify(points);
      if (isDifferent) {
        setPoints(controlPoints);
      }
    }
    isInternalUpdate.current = false;
  }, [controlPoints]);

  // 当控制点变化时通知父组件（只在内部更新时）
  const handlePointsChange = useCallback((newPoints, fromDrag = false) => {
    if (fromDrag) {
      isDraggingRef.current = true;
    }
    isInternalUpdate.current = true;
    setPoints(newPoints);
    if (onControlPointsChangeRef.current) {
      onControlPointsChangeRef.current(newPoints);
    }
  }, []);

  // 拖动结束时重置标志
  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    setDragState({ isDragging: false, type: null, id: null, handle: null });
  }, []);

  // 绘制所有内容（控制点、手柄、曲线、镜像）- 使用缓存避免重复计算
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // 生成一次曲线数据，复用给绘制和镜像
    const mirrorData = generateSmoothCurvePoints(points, centerX, true);

    // 1. 先绘制镜像曲线（右侧）- 使用虚线样式
    if (mirrorData.mirrorPoints && mirrorData.mirrorPoints.length >= 2) {
      ctx.strokeStyle = 'rgba(78, 205, 196, 0.4)'; // 淡色镜像
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]); // 虚线
      ctx.beginPath();
      ctx.moveTo(mirrorData.mirrorPoints[0].x, mirrorData.mirrorPoints[0].y);
      for (let i = 1; i < mirrorData.mirrorPoints.length; i++) {
        ctx.lineTo(mirrorData.mirrorPoints[i].x, mirrorData.mirrorPoints[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]); // 重置为实线
    }

    // 2. 绘制原始曲线（左侧）- 使用平滑曲线显示，方便用户看到贝塞尔效果
    const curvePoints = mirrorData.curvePoints || mirrorData;
    if (curvePoints.length >= 2) {
      ctx.strokeStyle = '#4ecdc4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
      for (let i = 1; i < curvePoints.length; i++) {
        ctx.lineTo(curvePoints[i].x, curvePoints[i].y);
      }
      ctx.stroke();
    }

    // 3. 绘制控制点和手柄（只绘制左侧的点）
    // 过滤出左侧的控制点（x < centerX）
    const leftPoints = points.filter(p => p && p.pos && p.pos[0] < centerX);
    leftPoints.forEach((point, index) => {
      // 安全检查
      if (!point || !point.pos || !point.pos[0] || !point.pos[1]) return;

      const { id, type, pos, handlepos } = point;
      const isSelected = id === selectedPointId;
      const isHovered = id === hoveredPoint;

      // 贝塞尔曲线：绘制手柄
      if (type === 'bezier' && handlepos && handlepos.length >= 4) {
        // 左手柄
        if (handlepos[0] !== undefined || handlepos[1] !== undefined) {
          ctx.strokeStyle = 'rgba(255, 107, 107, 0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(pos[0], pos[1]);
          ctx.lineTo(handlepos[0], handlepos[1]);
          ctx.stroke();

          // 手柄点
          ctx.fillStyle = dragState.isDragging && dragState.id === id && dragState.handle === 'cp1'
            ? '#ff0000' : 'rgba(255, 107, 107, 0.7)';
          ctx.beginPath();
          ctx.arc(handlepos[0], handlepos[1], 6, 0, Math.PI * 2);
          ctx.fill();
        }

        // 右手柄
        if (handlepos[2] !== undefined || handlepos[3] !== undefined) {
          ctx.strokeStyle = 'rgba(255, 107, 107, 0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(pos[0], pos[1]);
          ctx.lineTo(handlepos[2], handlepos[3]);
          ctx.stroke();

          // 手柄点
          ctx.fillStyle = dragState.isDragging && dragState.id === id && dragState.handle === 'cp2'
            ? '#ff0000' : 'rgba(255, 107, 107, 0.7)';
          ctx.beginPath();
          ctx.arc(handlepos[2], handlepos[3], 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.setLineDash([]);
      }

      // 绘制控制点
      if (type === 'bezier') {
        ctx.fillStyle = isSelected ? '#ffd93d' : (isHovered ? '#ff9f43' : '#ff6b6b');
      } else if (type === 'point') {
        ctx.fillStyle = isSelected ? '#ffd93d' : (isHovered ? '#ff9f43' : '#26de81');
      } else {
        ctx.fillStyle = isSelected ? '#ffd93d' : (isHovered ? '#ff9f43' : '#45aaf2');
      }

      ctx.beginPath();
      const radius = type === 'bezier' ? 8 : 6;
      ctx.arc(pos[0], pos[1], radius, 0, Math.PI * 2);
      ctx.fill();

      // 绘制编号（使用原始索引+1）
      const originalIndex = points.findIndex(p => p.id === point.id);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((originalIndex + 1).toString(), pos[0], pos[1]);
    });
  }, [points, selectedPointId, hoveredPoint, dragState, dimensions, centerX]);

  // 绘制
  useEffect(() => {
    draw();
  }, [draw]);

  // 获取鼠标位置
  const getMousePos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = dimensions.width / rect.width;
    const scaleY = dimensions.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, [dimensions]);

  // 检查点击了哪个元素
  const hitTest = useCallback((x, y) => {
    const hitRadius = 12;

    // 检查手柄
    for (const point of points) {
      if (!point || !point.pos || !point.pos[0] || !point.pos[1]) continue;
      if (point.type === 'bezier' && point.handlepos && point.handlepos.length >= 4) {
        // 左手柄
        if (point.handlepos[0] !== undefined) {
          const dist = Math.sqrt((x - point.handlepos[0]) ** 2 + (y - point.handlepos[1]) ** 2);
          if (dist < hitRadius) {
            return { type: 'handle', id: point.id, handle: 'cp1' };
          }
        }
        // 右手柄
        if (point.handlepos[2] !== undefined) {
          const dist = Math.sqrt((x - point.handlepos[2]) ** 2 + (y - point.handlepos[3]) ** 2);
          if (dist < hitRadius) {
            return { type: 'handle', id: point.id, handle: 'cp2' };
          }
        }
      }
    }

    // 检查控制点
    for (const point of points) {
      if (!point || !point.pos || !point.pos[0] || !point.pos[1]) continue;
      const dist = Math.sqrt((x - point.pos[0]) ** 2 + (y - point.pos[1]) ** 2);
      if (dist < hitRadius) {
        return { type: 'point', id: point.id };
      }
    }

    return null;
  }, [points]);

  // 鼠标移动
  const handleMouseMove = useCallback((e) => {
    const { x, y } = getMousePos(e);

    if (dragState.isDragging) {
      // 拖动中
      const newPoints = [...points];
      const pointIndex = newPoints.findIndex(p => p.id === dragState.id);
      if (pointIndex === -1) return;

      if (dragState.type === 'point') {
        // 拖动控制点 - 先保存旧位置
        const oldPos = [...newPoints[pointIndex].pos];
        newPoints[pointIndex] = {
          ...newPoints[pointIndex],
          pos: [x, y]
        };
        // 如果是贝塞尔，同步移动手柄（使用旧位置计算差值）
        if (newPoints[pointIndex].type === 'bezier' && newPoints[pointIndex].handlepos) {
          const hp = newPoints[pointIndex].handlepos;
          const dx = x - oldPos[0];
          const dy = y - oldPos[1];
          newPoints[pointIndex] = {
            ...newPoints[pointIndex],
            handlepos: [
              hp[0] + dx, hp[1] + dy,
              hp[2] + dx, hp[3] + dy
            ]
          };
        }
      } else if (dragState.type === 'handle') {
        // 拖动手柄 - 直接更新手柄位置
        const hp = [...newPoints[pointIndex].handlepos];
        if (dragState.handle === 'cp1') {
          hp[0] = x;
          hp[1] = y;
        } else {
          hp[2] = x;
          hp[3] = y;
        }
        newPoints[pointIndex] = {
          ...newPoints[pointIndex],
          handlepos: hp
        };
      }

      handlePointsChange(newPoints, true); // 标记为拖动操作
    } else {
      // 非拖动状态 - 检测悬停
      const hit = hitTest(x, y);
      setHoveredPoint(hit ? hit.id : null);

      // 更新光标
      const canvas = canvasRef.current;
      if (canvas) {
        if (hit) {
          canvas.style.cursor = hit.type === 'handle' ? 'pointer' : 'move';
        } else {
          canvas.style.cursor = 'crosshair';
        }
      }
    }
  }, [dragState, points, getMousePos, hitTest, handlePointsChange]);

  // 鼠标按下
  const handleMouseDown = useCallback((e) => {
    if (readOnly) return;
    const { x, y } = getMousePos(e);
    const hit = hitTest(x, y);

    if (hit) {
      setSelectedPointId(hit.id);
      setDragState({ isDragging: true, type: hit.type, id: hit.id, handle: hit.handle });
    } else {
      // 只能在左侧添加点（x < centerX）
      if (x >= centerX) return;

      // 点击空白处添加新点
      const newId = generateId();
      const lastPoint = points[points.length - 1];

      let newPoint;
      if (tool === TOOL_TYPES.BEZIER) {
        // 贝塞尔曲线 - 带默认手柄（左手柄保持在左侧）
        const handleLength = 40;
        newPoint = {
          id: newId,
          type: 'bezier',
          pos: [x, y],
          // 左手柄在左侧，右手柄也在左侧（不跨越中心线）
          handlepos: lastPoint
            ? [x - handleLength, y, x + handleLength * 0.5, y]
            : [x - handleLength, y, x + handleLength * 0.5, y],
          previd: lastPoint?.id || null
        };
      } else if (tool === TOOL_TYPES.POINT) {
        // 简单点
        newPoint = {
          id: newId,
          type: 'point',
          pos: [x, y],
          previd: lastPoint?.id || null
        };
      } else {
        // 自由绘制
        newPoint = {
          id: newId,
          type: 'draw',
          pos: [x, y],
          previd: lastPoint?.id || null
        };
      }

      handlePointsChange([...points, newPoint]);
      setSelectedPointId(newId);
    }
  }, [points, tool, readOnly, getMousePos, hitTest, handlePointsChange, centerX]);

  // 鼠标释放
  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    setDragState({ isDragging: false, type: null, id: null, handle: null });
  }, []);

  // 清除
  const handleClear = useCallback(() => {
    handlePointsChange([]);
    setSelectedPointId(null);
  }, [handlePointsChange]);

  // 删除选中点
  const handleDelete = useCallback(() => {
    if (selectedPointId === null) return;
    const newPoints = points.filter(p => p.id !== selectedPointId);
    handlePointsChange(newPoints);
    setSelectedPointId(null);
  }, [points, selectedPointId, handlePointsChange]);

  return (
    <div className="fullscreen-editor">
      {/* 工具栏 */}
      <div className="editor-toolbar">
        <div className="tool-group">
          <button
            className={`tool-btn ${tool === TOOL_TYPES.POINT ? 'active' : ''}`}
            onClick={() => setTool(TOOL_TYPES.POINT)}
            disabled={readOnly}
          >
            ✏️ 点绘
          </button>
          <button
            className={`tool-btn ${tool === TOOL_TYPES.BEZIER ? 'active' : ''}`}
            onClick={() => setTool(TOOL_TYPES.BEZIER)}
            disabled={readOnly}
          >
            🎨 贝塞尔
          </button>
          <button
            className={`tool-btn ${tool === TOOL_TYPES.FREE ? 'active' : ''}`}
            onClick={() => setTool(TOOL_TYPES.FREE)}
            disabled={readOnly}
          >
            🖌️ 自由绘制
          </button>
        </div>
        <div className="action-group">
          <button className="action-btn delete" onClick={handleDelete} disabled={!selectedPointId || readOnly}>
            删除
          </button>
          <button className="action-btn clear" onClick={handleClear} disabled={readOnly}>
            清空
          </button>
        </div>
      </div>

      {/* 画布 */}
      <div className="editor-canvas-container">
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        {/* 参考线 */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: '1px',
          backgroundColor: 'rgba(0,0,0,0.1)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: '1px',
          backgroundColor: 'rgba(0,0,0,0.1)',
          pointerEvents: 'none'
        }} />
      </div>

      {/* 提示 */}
      <div className="editor-hint">
        {tool === TOOL_TYPES.BEZIER && '💡 点击左侧添加贝塞尔锚点，拖动红色手柄调整曲率，拖动锚点移动位置。右侧显示镜像预览'}
        {tool === TOOL_TYPES.POINT && '💡 点击左侧添加点，拖动点移动位置。右侧显示镜像预览'}
        {tool === TOOL_TYPES.FREE && '💡 点击左侧添加自由绘制点。右侧显示镜像预览'}
      </div>
    </div>
  );
};

// 全屏模态窗口
const FullscreenModal = ({ isOpen, onClose, controlPoints, onControlPointsChange, title, readOnly }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="curve-editor-modal-overlay" onClick={onClose}>
      <div className="curve-editor-modal-content" onClick={e => e.stopPropagation()}>
        <div className="curve-editor-modal-header">
          <h3>{title} - 编辑模式</h3>
          <button className="curve-editor-close-btn" onClick={onClose}>×</button>
        </div>
        <FullscreenEditor
          controlPoints={controlPoints}
          onControlPointsChange={onControlPointsChange}
          title={title}
          readOnly={readOnly}
        />
        <div className="curve-editor-modal-footer">
          <button className="curve-editor-done-btn" onClick={onClose}>完成</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// 将控制点格式转换为曲线点格式（用于3D模型生成 - 使用平滑曲线）
// 控制点格式: {id, type, pos: [x, y], handlepos, ...}
// 曲线点格式: {x, y}
const convertControlPointsToCurvePoints = (controlPoints) => {
  if (!controlPoints || !Array.isArray(controlPoints)) return [];
  // 使用平滑曲线生成贝塞尔插值点
  return generateSmoothCurvePoints(controlPoints);
};

// 验证点数据是否有效（支持曲线点格式 {x, y} 和控制点格式 {pos: [x, y]}）
const isValidPoint = (point) => {
  if (!point) return false;

  // 曲线点格式 {x, y}
  if (typeof point.x === 'number' && typeof point.y === 'number' &&
    !isNaN(point.x) && !isNaN(point.y) &&
    isFinite(point.x) && isFinite(point.y)) {
    return true;
  }

  // 控制点格式 {pos: [x, y]}
  if (point.pos && Array.isArray(point.pos) && point.pos.length >= 2) {
    const x = point.pos[0];
    const y = point.pos[1];
    return typeof x === 'number' && typeof y === 'number' &&
      !isNaN(x) && !isNaN(y) && isFinite(x) && isFinite(y);
  }

  return false;
};

// 从点对象中提取坐标
const extractPointCoords = (point) => {
  if (!point) return null;

  // 曲线点格式 {x, y}
  if (typeof point.x === 'number' && typeof point.y === 'number') {
    return { x: point.x, y: point.y };
  }

  // 控制点格式 {pos: [x, y]}
  if (point.pos && Array.isArray(point.pos) && point.pos.length >= 2) {
    return { x: point.pos[0], y: point.pos[1] };
  }

  return null;
};

// 验证点数组是否有效
const isValidPointArray = (points) => {
  return points &&
    Array.isArray(points) &&
    points.length >= 2 &&
    points.every(isValidPoint);
};

// 增强曲线点密度 - 在高度相近的点之间添加中间点，防止3D模型出现断层
const densifyCurvePoints = (points, minHeightDiff = 0.5) => {
  if (!points || points.length < 2) return points;

  const result = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    result.push(p1);

    // 计算高度差
    const heightDiff = Math.abs(p2.y - p1.y);

    // 如果高度差太小，添加中间点
    if (heightDiff < minHeightDiff && heightDiff > 0) {
      const numInterpolate = Math.ceil(minHeightDiff / heightDiff);
      for (let j = 1; j < numInterpolate; j++) {
        const t = j / numInterpolate;
        result.push({
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t
        });
      }
    }
  }

  result.push(points[points.length - 1]);
  return result;
};

// 3D模型预览
export const ModelPreview = ({ profilePoints, pathPoints, generated }) => {
  // 如果没有点击生成按钮，不渲染3D几何体
  if (!generated) {
    return null;
  }

  // 将控制点转换为曲线点，并增强点密度
  const curveProfilePoints = useMemo(() => {
    const points = convertControlPointsToCurvePoints(profilePoints);
    return densifyCurvePoints(points, 2.0); // 最小高度差2.0
  }, [profilePoints]);

  const curvePathPoints = useMemo(() => {
    const points = convertControlPointsToCurvePoints(pathPoints);
    return densifyCurvePoints(points, 2.0);
  }, [pathPoints]);

  const geometries = useMemo(() => {
    // 验证输入数据
    if (!isValidPointArray(curveProfilePoints)) {
      console.warn('Invalid profilePoints:', profilePoints);
      return null;
    }

    try {
      // 轮廓曲线转换 - 添加严格验证
      const profile2D = [];
      for (const point of curveProfilePoints) {
        const coords = extractPointCoords(point);
        if (!coords) continue;

        // 确保坐标在合理范围内
        const x = Math.max(0, Math.min(1200, coords.x));
        const y = Math.max(0, Math.min(675, coords.y));

        // 转换为旋转体参数 (radius, height)
        // 假设画布坐标系: x从左到右, y从上到下
        // 转换为: radius从中心向外, height从下到上
        const radius = Math.abs(x - 600) / 50;  // 中心在600
        const height = (337.5 - y) / 30;        // 中心在337.5

        // 验证转换后的值
        if (!isNaN(radius) && !isNaN(height) && isFinite(radius) && isFinite(height)) {
          profile2D.push({ radius, height });
        }
      }

      if (profile2D.length < 2) {
        console.warn('Not enough valid profile points:', profile2D.length);
        return null;
      }

      // 按高度排序（从下到上）
      profile2D.sort((a, b) => a.height - b.height);

      // 再次检查并添加中间点（防止排序后高度太接近）
      const densifiedProfile2D = densifyCurvePoints(profile2D.map(p => ({ x: p.radius, y: p.height })), 0.3);

      // 检查是否有路径曲线
      const hasPath = isValidPointArray(curvePathPoints);

      if (hasPath) {
        // 扫掠模式
        const profile3D = [];
        for (const point of curveProfilePoints) {
          const coords = extractPointCoords(point);
          if (!coords) continue;
          const x = Math.max(0, Math.min(1200, coords.x));
          const y = Math.max(0, Math.min(675, coords.y));
          const m = Math.abs(x - 600) / 600;
          const n = (337.5 - y) / 30;
          if (!isNaN(m) && !isNaN(n) && isFinite(m) && isFinite(n)) {
            profile3D.push({ m, n });
          }
        }

        const path3D = [];
        for (const point of curvePathPoints) {
          const coords = extractPointCoords(point);
          if (!coords) continue;
          const x = Math.max(0, Math.min(1200, coords.x));
          const y = Math.max(0, Math.min(675, coords.y));
          const px = (x - 600) / 100;
          const pz = (337.5 - y) / 100;
          if (!isNaN(px) && !isNaN(pz) && isFinite(px) && isFinite(pz)) {
            path3D.push({ x: px, z: pz });
          }
        }

        if (profile3D.length < 2 || path3D.length < 2) {
          console.warn('Not enough valid points for sweep');
          return null;
        }

        const vertices = [];
        const profileSteps = profile3D.length;
        const pathSteps = path3D.length;

        for (let i = 0; i < pathSteps; i++) {
          const pathPoint = path3D[i];
          for (let j = 0; j < profileSteps; j++) {
            const profilePoint = profile3D[j];
            vertices.push(new Vector3(
              profilePoint.m * pathPoint.x,
              profilePoint.n,
              profilePoint.m * pathPoint.z
            ));
          }
        }

        const positions = [];
        const indices = [];

        for (const vertex of vertices) {
          // 最终验证
          if (!isFinite(vertex.x) || !isFinite(vertex.y) || !isFinite(vertex.z)) {
            continue;
          }
          positions.push(vertex.x, vertex.y, vertex.z);
        }

        if (positions.length < 9) {  // 至少需要3个点才能形成三角形
          console.warn('Not enough valid vertices');
          return null;
        }

        for (let i = 0; i < pathSteps - 1; i++) {
          for (let j = 0; j < profileSteps - 1; j++) {
            const a = i * profileSteps + j;
            const b = i * profileSteps + (j + 1);
            const c = (i + 1) * profileSteps + j;
            const d = (i + 1) * profileSteps + (j + 1);
            indices.push(a, b, c, c, b, d);
          }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        return { sweep: geometry };
      } else {
        // 旋转体模式 - 使用增强后的点
        const profile3D = [];
        for (const p of densifiedProfile2D) {
          if (!isNaN(p.x) && !isNaN(p.y) && isFinite(p.x) && isFinite(p.y)) {
            profile3D.push(new Vector3(Math.max(0.01, p.x), p.y, 0));
          }
        }

        if (profile3D.length < 2) {
          console.warn('Not enough valid profile3D points');
          return null;
        }

        return {
          main: new LatheGeometry(profile3D, 64, 0, Math.PI * 2)
        };
      }
    } catch (error) {
      console.error('Geometry error:', error);
      return null;
    }
  }, [curveProfilePoints, curvePathPoints]);

  if (!geometries) return null;

  if (geometries.sweep) {
    return (
      <mesh castShadow receiveShadow>
        <primitive object={geometries.sweep} />
        <meshStandardMaterial color="#4ecdc4" side={THREE.DoubleSide} metalness={0.5} roughness={0.3} />
      </mesh>
    );
  }

  if (geometries.main) {
    return (
      <mesh castShadow receiveShadow>
        <primitive object={geometries.main} />
        <meshStandardMaterial color="#4ecdc4" side={THREE.DoubleSide} metalness={0.5} roughness={0.3} />
      </mesh>
    );
  }

  return null;
};

// 主组件
const CustomRevolutionGenerator = ({ currentChess, selectedComponent, handleDataUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCurve, setEditingCurve] = useState('profile'); // 'profile' or 'path'

  // 从棋子数据获取控制点
  const currentCustomShape = selectedComponent === 'base'
    ? currentChess?.parts?.base?.customShape
    : currentChess?.parts?.column?.customShape;

  const profileControlPoints = currentCustomShape?.profilePoints || [];
  const pathControlPoints = currentCustomShape?.pathPoints || [];
  const isGenerated = currentCustomShape?.generated || false;

  // 轮廓曲线数据变化
  const handleProfileControlChange = useCallback((newControlPoints) => {
    if (handleDataUpdate) {
      handleDataUpdate(`parts.${selectedComponent}.customShape.profilePoints`, newControlPoints);
    }
  }, [selectedComponent, handleDataUpdate]);

  // 路径曲线数据变化
  const handlePathControlChange = useCallback((newControlPoints) => {
    if (handleDataUpdate) {
      handleDataUpdate(`parts.${selectedComponent}.customShape.pathPoints`, newControlPoints);
    }
  }, [selectedComponent, handleDataUpdate]);

  // 处理生成3D几何体 - 点击"生成"按钮时调用
  const handleGenerateGeometry = useCallback(() => {
    if (handleDataUpdate) {
      handleDataUpdate(`parts.${selectedComponent}.customShape.generated`, true);
    }
  }, [selectedComponent, handleDataUpdate]);

  // 小窗口曲线点变化时更新（仅用于实时预览，不触发状态更新）
  // 直接忽略这些回调，因为 PreviewCanvas 内部已经处理了显示
  const handleProfileCurveChange = useCallback(() => {
    // 不需要做任何事情，曲线已经在画布上绘制了
  }, []);

  const handlePathCurveChange = useCallback(() => {
    // 不需要做任何事情，曲线已经在画布上绘制了
  }, []);

  // 打开编辑窗口
  const openEditor = (curveType) => {
    setEditingCurve(curveType);
    setIsModalOpen(true);
  };

  // 获取当前编辑的曲线数据
  const currentControlPoints = editingCurve === 'profile' ? profileControlPoints : pathControlPoints;
  const currentControlChange = editingCurve === 'profile' ? handleProfileControlChange : handlePathControlChange;
  const currentTitle = editingCurve === 'profile' ? '轮廓曲线' : '路径曲线';

  return (
    <div className="custom-revolution-scroll-container">
      <div className="custom-revolution-panel">
        <div className="panel-section">
          <h3>异形生成器</h3>
          <p className="panel-description">
            点击"编辑"按钮在大窗口中编辑曲线，小窗口实时预览生成的形状
          </p>
        </div>

        <div className="canvases-row">
          {/* 轮廓曲线 - 小窗口 */}
          <div className="canvas-wrapper">
            <PreviewCanvas
              title="轮廓曲线"
              controlPoints={profileControlPoints}
              onCurveChange={handleProfileCurveChange}
            />
            <button
              className="edit-btn"
              onClick={() => openEditor('profile')}
            >
              ✏️ 编辑
            </button>
          </div>

          {/* 路径曲线 - 小窗口 */}
          <div className="canvas-wrapper">
            <PreviewCanvas
              title="路径曲线 (可选)"
              controlPoints={pathControlPoints}
              onCurveChange={handlePathCurveChange}
            />
            <button
              className="edit-btn"
              onClick={() => openEditor('path')}
            >
              ✏️ 编辑
            </button>
          </div>
        </div>

        {/* 生成按钮 */}
        <div className="generate-section">
          {!isGenerated ? (
            <button
              className="generate-btn"
              onClick={handleGenerateGeometry}
              disabled={profileControlPoints.length < 2}
            >
              🎮 生成 3D 模型
            </button>
          ) : (
            <button
              className="generate-btn generated"
              onClick={handleGenerateGeometry}
            >
              🔄 重新生成
            </button>
          )}
          {isGenerated && (
            <span className="generated-status">✓ 3D 模型已生成</span>
          )}
        </div>
      </div>

      {/* 全屏编辑模态窗口 */}
      <FullscreenModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        controlPoints={currentControlPoints}
        onControlPointsChange={currentControlChange}
        title={`${currentTitle}编辑`}
      />
    </div>
  );
};

export default CustomRevolutionGenerator;
