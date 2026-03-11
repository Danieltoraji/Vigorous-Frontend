import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CatmullRomCurve3, Vector3, LatheGeometry, TubeGeometry, Shape, ExtrudeGeometry, Vector2, Float32BufferAttribute, QuadraticBezierCurve3, CubicBezierCurve3 } from 'three';
import * as THREE from 'three';
import { createPortal } from 'react-dom';



// 简化的 2D 画布组件 - 支持三种绘制模式
const SimpleCanvas = ({
  title,
  onPointsChange,
  equationPlaceholder,
  className = "",
  initialPoints = [], // 接收初始点数据
  enableBezier = true, // 是否启用贝塞尔曲线模式
  readOnly = false, // 只读模式
  showFullScreen = true // 是否显示全屏按钮
}) => {
  const canvasRef = useRef(null);

  const [points, setPoints] = useState([]); // 完全独立管理状态
  const [equation, setEquation] = useState('');

  // 新增：全屏模态窗口状态
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 三种模式的状态完全独立
  const [drawMode, setDrawMode] = useState('point'); // 'point'（点绘）, 'bezier'（贝塞尔控制点）, 'free'（自由绘制）
  const [clickPoints, setClickPoints] = useState([]); // 点绘模式的点击点
  // 贝塞尔模式：使用锚点和手柄结构
  const [bezierAnchors, setBezierAnchors] = useState([]); // [{x, y, cp1: {x, y}, cp2: {x, y}}]
  const [selectedAnchorIndex, setSelectedAnchorIndex] = useState(-1);
  const [freehandPoints, setFreehandPoints] = useState([]); // 自由绘制的连续点

  // 拖动状态（只记录当前正在拖动的元素）
  const [dragState, setDragState] = useState({
    isDragging: false,
    targetType: null, // 'anchor' | 'handle' | 'freehand' | 'point'
    targetIndex: -1,
    handleType: null // 'cp1' | 'cp2'
  });

  // 悬停状态检测 - 支持所有模式
  const [hoveredElement, setHoveredElement] = useState(null);
  // {type: 'anchor'|'handle'|'point', index: number, handleType: 'cp1'|'cp2'}

  // 统一的光标样式更新函数
  const updateCursorStyle = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 如果正在拖动，保持拖动时的光标状态
    if (dragState.isDragging) {
      if (dragState.targetType === 'handle') {
        canvas.style.cursor = 'crosshair'; // 拖动手柄：十字光标
      } else if (dragState.targetType === 'anchor' || dragState.targetType === 'point') {
        canvas.style.cursor = 'move'; // 拖动锚点或点：移动光标
      } else if (dragState.targetType === 'freehand') {
        canvas.style.cursor = 'crosshair'; // 自由绘制：十字光标
      } else {
        canvas.style.cursor = 'default';
      }
      return;
    }

    // 未拖动时，根据模式和悬停元素显示光标
    if (drawMode === 'free') {
      // 自由绘制模式：始终是 crosshair
      canvas.style.cursor = 'crosshair';
    } else if (drawMode === 'point') {
      // 点绘模式：悬停在点上为 move，否则为 crosshair
      if (hoveredElement?.type === 'point') {
        canvas.style.cursor = 'move';
      } else {
        canvas.style.cursor = 'crosshair';
      }
    } else if (drawMode === 'bezier') {
      // 贝塞尔模式：
      // - 悬停在手柄上：pointer
      // - 悬停在锚点上：move
      // - 其他：crosshair
      if (hoveredElement?.type === 'handle') {
        canvas.style.cursor = 'pointer';
      } else if (hoveredElement?.type === 'anchor') {
        canvas.style.cursor = 'move';
      } else {
        canvas.style.cursor = 'crosshair';
      }
    } else {
      canvas.style.cursor = 'default';
    }
  }, [drawMode, hoveredElement, dragState]);

  // 当拖动状态或悬停状态变化时，更新光标
  useEffect(() => {
    updateCursorStyle();
  }, [dragState, hoveredElement, drawMode, updateCursorStyle]);

  // 检查指定坐标是否悬停在可交互元素上 - 支持所有模式
  const checkHover = useCallback((x, y) => {
    if (!enableBezier) {
      setHoveredElement(null);
      return;
    }

    let hoverFound = null;

    if (drawMode === 'bezier') {
      // 贝塞尔模式：检查锚点和手柄
      for (let i = 0; i < bezierAnchors.length; i++) {
        const anchor = bezierAnchors[i];

        // 检查左手柄 cp1
        if (anchor.cp1) {
          const dist1 = Math.sqrt((x - anchor.cp1.x) ** 2 + (y - anchor.cp1.y) ** 2);
          if (dist1 < 8) {
            hoverFound = { type: 'handle', index: i, handleType: 'cp1' };
            break;
          }
        }

        // 检查右手柄 cp2
        if (anchor.cp2) {
          const dist2 = Math.sqrt((x - anchor.cp2.x) ** 2 + (y - anchor.cp2.y) ** 2);
          if (dist2 < 8) {
            hoverFound = { type: 'handle', index: i, handleType: 'cp2' };
            break;
          }
        }

        // 检查锚点本身
        const distAnchor = Math.sqrt((x - anchor.x) ** 2 + (y - anchor.y) ** 2);
        if (distAnchor < 8) {
          hoverFound = { type: 'anchor', index: i };
          break;
        }
      }
    } else if (drawMode === 'point') {
      // 点绘模式：检查是否悬停在点上
      for (let i = 0; i < clickPoints.length; i++) {
        const point = clickPoints[i];
        const dist = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
        if (dist < 8) {
          hoverFound = { type: 'point', index: i };
          break;
        }
      }
    }

    setHoveredElement(hoverFound);
  }, [drawMode, enableBezier, bezierAnchors, clickPoints]);

  // 鼠标在画布上移动（不按按钮）- 用于悬停检测
  const handleMouseHover = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // 存储鼠标位置供其他函数使用
    document.pointer = { x, y };

    // 只在非拖动状态下检测悬停
    if (!dragState.isDragging) {
      checkHover(x, y);
    }
  }, [checkHover, dragState.isDragging]);

  // 鼠标离开画布
  const handleMouseLeave = useCallback(() => {
    // 如果在拖动中，保持拖动状态（用户可能拖到画布外）
    // 如果不在拖动中，清除悬停状态
    if (!dragState.isDragging) {
      setHoveredElement(null);
    }
  }, [dragState.isDragging]);

  // 初始化时加载 external points
  useEffect(() => {
    if (initialPoints && initialPoints.length > 0) {
      if (drawMode === 'bezier') {
        // 将旧格式的控制点转换为锚点格式
        const anchors = initialPoints.map((pt, idx) => ({
          x: pt.x,
          y: pt.y,
          cp1: { x: pt.x - 20, y: pt.y }, // 默认向左的手柄
          cp2: { x: pt.x + 20, y: pt.y }  // 默认向右的手柄
        }));
        setBezierAnchors(anchors);
      } else if (drawMode === 'free') {
        setFreehandPoints(initialPoints);
      } else {
        setClickPoints(initialPoints);
      }
    }
  }, []);

  // 当模式切换或 initialPoints 变化时，重新绘制
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 根据当前模式绘制对应的图形
    if (drawMode === 'point' && clickPoints.length > 0) {
      // 点绘模式：绘制折线
      clickPoints.forEach((point, index) => {
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fill();

        if (index > 0) {
          const prevPoint = clickPoints[index - 1];
          ctx.strokeStyle = '#4ecdc4';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(prevPoint.x, prevPoint.y);
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
        }
      });

      // 实时预览连线（如果正在拖动点）
      if (dragState.isDragging && dragState.targetType === 'point' && clickPoints.length > 0) {
        const lastPoint = clickPoints[clickPoints.length - 1];
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (document.pointer || {}).x;
        const mouseY = (document.pointer || {}).y;

        if (mouseX !== undefined && mouseY !== undefined) {
          ctx.strokeStyle = '#4ecdc4';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(lastPoint.x, lastPoint.y);
          ctx.lineTo(mouseX, mouseY);
          ctx.stroke();
        }
      }
    }
    else if (drawMode === 'bezier' && bezierAnchors.length >= 2) {
      // 贝塞尔模式：绘制锚点、手柄和三次贝塞尔曲线
      drawBezierWithHandles(ctx, bezierAnchors);
    }
    else if (drawMode === 'free' && freehandPoints.length > 0) {
      // 自由绘制模式：绘制平滑的手绘曲线
      drawFreehandCurve(ctx, freehandPoints);
    }
  }, [drawMode, clickPoints, bezierAnchors, freehandPoints]);

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

  // 绘制自由手绘曲线（使用 Catmull-Rom 样条插值实现平滑）
  const drawFreehandCurve = useCallback((ctx, pts) => {
    if (pts.length < 2) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 使用 Catmull-Rom 样条插值使曲线更平滑
    const smoothPoints = [];
    const tension = 0.5; // 张力系数，控制曲线平滑度

    for (let i = 0; i < pts.length; i++) {
      smoothPoints.push({ ...pts[i] });

      // 在相邻点之间插入中间点
      if (i > 0 && i < pts.length - 1) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];

        // 计算切线
        const t1x = (p2.x - p0.x) * tension;
        const t1y = (p2.y - p0.y) * tension;

        // 插入 3 个中间点
        for (let j = 1; j <= 3; j++) {
          const t = j / 4;
          const x = p1.x + t * t1x;
          const y = p1.y + t * t1y;
          smoothPoints.push({ x, y });
        }
      }
    }

    // 绘制平滑曲线
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (smoothPoints.length > 0) {
      ctx.moveTo(smoothPoints[0].x, smoothPoints[0].y);

      // 使用二次贝塞尔曲线连接所有点
      for (let i = 1; i < smoothPoints.length - 1; i++) {
        const xc = (smoothPoints[i].x + smoothPoints[i + 1].x) / 2;
        const yc = (smoothPoints[i].y + smoothPoints[i + 1].y) / 2;
        ctx.quadraticCurveTo(smoothPoints[i].x, smoothPoints[i].y, xc, yc);
      }

      // 连接最后一个点
      if (smoothPoints.length > 1) {
        ctx.lineTo(smoothPoints[smoothPoints.length - 1].x, smoothPoints[smoothPoints.length - 1].y);
      }
    }
    ctx.stroke();

    // 绘制起点和终点标记
    if (pts.length > 0) {
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, 4, 0, Math.PI * 2);
      ctx.fill();

      if (pts.length > 1) {
        ctx.fillStyle = '#ffd93d';
        ctx.beginPath();
        ctx.arc(pts[pts.length - 1].x, pts[pts.length - 1].y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return smoothPoints;
  }, []);

  // 绘制带手柄的三次贝塞尔曲线（Photoshop 风格）
  const drawBezierWithHandles = useCallback((ctx, anchors) => {
    if (anchors.length < 2) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 设置画布光标样式 - 根据拖动状态和悬停状态
    const canvas = canvasRef.current;
    if (canvas) {
    }

    // 1. 绘制控制手柄和锚点连线
    anchors.forEach((anchor, idx) => {
      // 绘制手柄线（虚线）
      ctx.strokeStyle = 'rgba(255, 107, 107, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // 左手柄
      if (anchor.cp1) {
        ctx.beginPath();
        ctx.moveTo(anchor.x, anchor.y);
        ctx.lineTo(anchor.cp1.x, anchor.cp1.y);
        ctx.stroke();

        // 手柄控制点
        ctx.fillStyle = 'rgba(255, 107, 107, 0.6)';
        ctx.beginPath();
        ctx.arc(anchor.cp1.x, anchor.cp1.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // 右手柄
      if (anchor.cp2) {
        ctx.beginPath();
        ctx.moveTo(anchor.x, anchor.y);
        ctx.lineTo(anchor.cp2.x, anchor.cp2.y);
        ctx.stroke();

        // 手柄控制点
        ctx.fillStyle = 'rgba(255, 107, 107, 0.6)';
        ctx.beginPath();
        ctx.arc(anchor.cp2.x, anchor.cp2.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.setLineDash([]);
    });

    // 2. 绘制三次贝塞尔曲线路径
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(anchors[0].x, anchors[0].y);

    for (let i = 0; i < anchors.length - 1; i++) {
      const p0 = anchors[i];
      const p1 = anchors[i + 1];

      // 使用三次贝塞尔曲线连接两个锚点
      // cp2 是起点的出方向，cp1 是终点的入方向
      ctx.bezierCurveTo(
        p0.cp2.x, p0.cp2.y,  // 起点控制点（右手柄）
        p1.cp1.x, p1.cp1.y,  // 终点控制点（左手柄）
        p1.x, p1.y           // 终点
      );
    }
    ctx.stroke();

    // 3. 绘制锚点（实心圆）
    anchors.forEach((anchor, idx) => {
      ctx.fillStyle = idx === selectedAnchorIndex ? '#ffd93d' : '#ff6b6b';
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // 绘制锚点编号
      ctx.fillStyle = '#fff';
      ctx.font = '10px Arial';
      ctx.fillText((idx + 1).toString(), anchor.x + 8, anchor.y - 8);
    });

    // 4. 显示当前点数提示
    if (anchors.length >= 2) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.font = '12px Arial';
      ctx.fillText(`锚点：${anchors.length}`, 10, 20);
    }
  }, [selectedAnchorIndex]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    if (readOnly) return; // 只读模式下禁用

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (drawMode === 'free' && enableBezier) {
      // 自由绘制模式：开始连续绘制
      setDragState({
        isDragging: true,
        targetType: 'freehand',
        targetIndex: -1,
        handleType: null
      });
      const newPoint = { x, y };
      setFreehandPoints([newPoint]);

      // 绘制起点
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (drawMode === 'bezier' && enableBezier) {
      // 贝塞尔模式：根据悬停元素决定拖动类型
      if (hoveredElement?.type === 'handle') {
        // 情况 1: 鼠标在手柄上 - 拖动手柄
        setDragState({
          isDragging: true,
          targetType: 'handle',
          targetIndex: hoveredElement.index,
          handleType: hoveredElement.handleType
        });

      } else if (hoveredElement?.type === 'anchor') {
        // 情况 2: 鼠标在锚点上 - 拖动锚点
        setDragState({
          isDragging: true,
          targetType: 'anchor',
          targetIndex: hoveredElement.index,
          handleType: null
        });

      } else {
        // 情况 3: 鼠标在空白处 - 添加新锚点
        const defaultHandleLength = 30;

        let cp1Offset = { x: -defaultHandleLength, y: 0 };
        let cp2Offset = { x: defaultHandleLength, y: 0 };

        if (bezierAnchors.length > 0) {
          const prevAnchor = bezierAnchors[bezierAnchors.length - 1];
          const dx = x - prevAnchor.x;
          const dy = y - prevAnchor.y;
          const len = Math.sqrt(dx * dx + dy * dy);

          if (len > 0) {
            const ux = dx / len;
            const uy = dy / len;

            cp1Offset = { x: -ux * defaultHandleLength, y: -uy * defaultHandleLength };
            cp2Offset = { x: ux * defaultHandleLength, y: uy * defaultHandleLength };
          }
        }

        const newAnchor = {
          x,
          y,
          cp1: { x: x + cp1Offset.x, y: y + cp1Offset.y },
          cp2: { x: x + cp2Offset.x, y: y + cp2Offset.y }
        };

        const newAnchors = [...bezierAnchors, newAnchor];
        setBezierAnchors(newAnchors);

        // 立即重绘
        const ctx = canvas.getContext('2d');
        drawBezierWithHandles(ctx, newAnchors);
      }

    } else if (drawMode === 'point') {
      // 点绘模式：检查是否点击在已有点上
      if (hoveredElement?.type === 'point') {
        // 情况 1: 鼠标在点上 - 拖动该点
        setDragState({
          isDragging: true,
          targetType: 'point',
          targetIndex: hoveredElement.index,
          handleType: null
        });
      } else {
        // 情况 2: 鼠标在空白处 - 添加新点
        setDragState({
          isDragging: true,
          targetType: 'point',
          targetIndex: -1,
          handleType: null
        });
        const newPoint = { x, y };
        setClickPoints(prev => [...prev, newPoint]);

        // 绘制点
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [drawMode, enableBezier, bezierAnchors, hoveredElement, drawBezierWithHandles]);

  const handleMouseMove = useCallback((e) => {
    if (!dragState.isDragging || readOnly) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (drawMode === 'free' && enableBezier) {
      // 自由绘制模式：连续添加点并实时绘制平滑曲线
      setFreehandPoints(prev => {
        const updated = [...prev, { x, y }];
        const ctx = canvas.getContext('2d');
        drawFreehandCurve(ctx, updated);
        return updated;
      });

    } else if (drawMode === 'bezier' && enableBezier) {
      // 贝塞尔模式：根据拖动类型处理
      if (dragState.targetType === 'handle') {
        // 拖动手柄：只更新手柄位置
        const newAnchors = [...bezierAnchors];
        const anchorIndex = dragState.targetIndex;
        const handleType = dragState.handleType;

        if (anchorIndex >= 0 && anchorIndex < newAnchors.length) {
          // 更新对应手柄的位置
          newAnchors[anchorIndex][handleType] = { x, y };

          setBezierAnchors(newAnchors);

          // 实时重绘
          const ctx = canvas.getContext('2d');
          drawBezierWithHandles(ctx, newAnchors);
        }

      } else if (dragState.targetType === 'anchor') {
        // 拖动锚点：移动锚点和两个手柄
        const newAnchors = [...bezierAnchors];
        const anchorIndex = dragState.targetIndex;

        if (anchorIndex >= 0 && anchorIndex < newAnchors.length) {
          const anchor = newAnchors[anchorIndex];
          const dx = x - anchor.x;
          const dy = y - anchor.y;

          // 移动锚点
          anchor.x = x;
          anchor.y = y;

          // 同步移动两个手柄
          if (anchor.cp1) {
            anchor.cp1.x += dx;
            anchor.cp1.y += dy;
          }
          if (anchor.cp2) {
            anchor.cp2.x += dx;
            anchor.cp2.y += dy;
          }

          setBezierAnchors(newAnchors);

          // 实时重绘
          const ctx = canvas.getContext('2d');
          drawBezierWithHandles(ctx, newAnchors);
        }

      }

    } else if (drawMode === 'point') {
      // 点绘模式：拖动已存在的点或预览新点
      if (dragState.targetIndex >= 0) {
        // 拖动已存在的点
        const newPoints = [...clickPoints];
        const pointIndex = dragState.targetIndex;

        if (pointIndex >= 0 && pointIndex < newPoints.length) {
          newPoints[pointIndex] = { x, y };
          setClickPoints(newPoints);

          // 立即重绘
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // 重新绘制所有点和线
          newPoints.forEach((point, index) => {
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
            ctx.fill();

            if (index > 0) {
              const prevPoint = newPoints[index - 1];
              ctx.strokeStyle = '#4ecdc4';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(prevPoint.x, prevPoint.y);
              ctx.lineTo(point.x, point.y);
              ctx.stroke();
            }
          });
        }
      } else {
        // 预览新点（不保存，只绘制临时线）
        const lastPoint = clickPoints[clickPoints.length - 1];
        if (lastPoint) {
          // 临时绘制 preview 线（不保存）
          const ctx = canvas.getContext('2d');
          ctx.strokeStyle = '#4ecdc4';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(lastPoint.x, lastPoint.y);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }
    }
  }, [dragState, clickPoints, drawMode, enableBezier, bezierAnchors, drawBezierWithHandles, drawFreehandCurve]);

  const handleMouseUp = useCallback(() => {
    if (readOnly) return;

    if (drawMode === 'free' && enableBezier) {
      // 自由绘制模式：完成绘制，输出所有点
      if (onPointsChange && freehandPoints.length > 1) {
        console.log("自由绘制完成，共", freehandPoints.length, "个点");
        onPointsChange(freehandPoints);
      }

    } else if (drawMode === 'bezier' && enableBezier) {
      // 贝塞尔模式：完成拖动，输出数据
      if (dragState.isDragging && bezierAnchors.length >= 2) {
        const curvePoints = generateBezierPointsFromAnchors(bezierAnchors);

        if (dragState.targetType === 'anchor' || dragState.targetType === 'handle') {
          // 拖动锚点或手柄后输出
          console.log("贝塞尔曲线编辑完成");
          onPointsChange(curvePoints);
        } else if (dragState.targetType === null && bezierAnchors.length > 0) {
          // 添加新锚点后输出
          console.log("贝塞尔曲线绘制完成，共", bezierAnchors.length, "个锚点");
          onPointsChange(curvePoints);
        }
      }

    } else if (drawMode === 'point') {
      // 点绘模式：完成点的添加或拖动
      if (onPointsChange && clickPoints.length > 0) {
        if (dragState.targetIndex >= 0) {
          // 拖动已存在的点后输出
          console.log("点位置编辑完成");
        } else {
          // 添加新点后输出
          console.log("点绘完成，共", clickPoints.length, "个点");
        }
        onPointsChange(clickPoints);
      }
    }

    // 重置拖动状态
    setDragState({
      isDragging: false,
      targetType: null,
      targetIndex: -1,
      handleType: null
    });
  }, [onPointsChange, drawMode, enableBezier, clickPoints, bezierAnchors, dragState, freehandPoints]);

  // 从贝塞尔锚点生成密集点阵（用于 3D 生成）
  const generateBezierPointsFromAnchors = useCallback((anchors) => {
    if (anchors.length < 2) return [];

    const curvePoints = [];
    const segmentsPerSpan = 50; // 每两个锚点之间的分段数

    for (let i = 0; i < anchors.length - 1; i++) {
      const p0 = anchors[i];
      const p1 = anchors[i + 1];

      // 对每一段三次贝塞尔曲线进行采样
      for (let t = 0; t <= segmentsPerSpan; t++) {
        const ratio = t / segmentsPerSpan;

        // 三次贝塞尔曲线公式
        const invRatio = 1 - ratio;

        // B(t) = (1-t)³·P0 + 3(1-t)²·t·CP0 + 3(1-t)·t²·CP1 + t³·P1
        const x = Math.pow(invRatio, 3) * p0.x +
          3 * Math.pow(invRatio, 2) * ratio * p0.cp2.x +
          3 * invRatio * Math.pow(ratio, 2) * p1.cp1.x +
          Math.pow(ratio, 3) * p1.x;

        const y = Math.pow(invRatio, 3) * p0.y +
          3 * Math.pow(invRatio, 2) * ratio * p0.cp2.y +
          3 * invRatio * Math.pow(ratio, 2) * p1.cp1.y +
          Math.pow(ratio, 3) * p1.y;

        curvePoints.push({ x, y });
      }
    }

    // 添加最后一个锚点
    curvePoints.push({
      x: anchors[anchors.length - 1].x,
      y: anchors[anchors.length - 1].y
    });

    return curvePoints;
  }, []);


  const clearCanvas = useCallback(() => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 清空所有模式的点
    setClickPoints([]);
    setBezierAnchors([]);
    setFreehandPoints([]);
    setSelectedAnchorIndex(-1);
    setDragState({
      isDragging: false,
      targetType: null,
      targetIndex: -1,
      handleType: null
    });
    setEquation('');

    if (onPointsChange) {
      onPointsChange([]);
    }
  }, [onPointsChange]);

  const toggleDrawMode = useCallback(() => {
    if (readOnly) return;

    // 三种模式循环切换：point -> bezier -> free -> point
    setDrawMode(prev => {
      if (prev === 'point') return 'bezier';
      if (prev === 'bezier') return 'free';
      return 'point';
    });
  }, [readOnly]);

  const generateFromEquation = useCallback(() => {
    if (readOnly || !equation.trim()) return;

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
          // 方程计算错误，跳过该点
        }
      }

      setPoints(newPoints);
      // 立即调用回调，确保数据被保存
      if (onPointsChange) {
        console.log("绘制完成");
        onPointsChange(newPoints);
      }
    } catch (error) {
      // 方程解析错误，静默处理
    }
  }, [equation, drawPoint, drawLine, onPointsChange]);

  // 打开全屏模态窗口
  const openModal = useCallback(() => {
    console.log('打开全屏模态窗口');
    setIsModalOpen(true);
    // 临时测试：显示 alert 确认函数被调用
    setTimeout(() => {
      console.log('状态已更新，当前 isModalOpen:', document.body.innerHTML.includes('modal-overlay'));
    }, 100);
    document.body.style.overflow = 'hidden'; // 禁用背景滚动
  }, []);

  // 关闭全屏模态窗口
  const closeModal = useCallback(() => {
    console.log('关闭全屏模态窗口');
    setIsModalOpen(false);
    document.body.style.overflow = ''; // 恢复背景滚动
  }, []);

  // ESC 键退出
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isModalOpen, closeModal]);

  // 渲染全屏模态窗口内容
  const renderModalContent = () => {
    console.log('renderModalContent 被调用，isModalOpen:', isModalOpen);
    if (!isModalOpen) {
      console.log('isModalOpen 为 false，返回 null');
      return null;
    }

    console.log('开始创建 Portal，document.body:', document.body);
    const portalContent = createPortal(
      <div
        onClick={closeModal}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,  // 提高 z-index 确保在最上层
          width: '100vw',
          height: '100vh'
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--fluent-acrylic)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: '1px solid var(--fluent-border)',
            borderRadius: 'var(--fluent-radius)',
            boxShadow: 'var(--fluent-shadow-hover)',
            width: '95vw',
            height: '90vh',
            maxHeight: '90vh',
            overflow: 'auto',
            animation: 'slideIn 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000000  // 确保内容在遮罩之上
          }}
        >
          {/* 模态窗口头部 */}
          <div className="modal-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid var(--fluent-border-light)',
            background: '#ffffff80',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--fluent-text)' }}>
              {title} - 全屏绘制
            </h3>
            <button
              onClick={closeModal}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: 'var(--fluent-text-tertiary)',
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--fluent-radius)',
                transition: 'var(--fluent-transition)'
              }}
              title="关闭 (ESC)"
            >
              ×
            </button>
          </div>

          {/* 模态窗口主体 - 保持画布比例 */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto'
          }}>
            <div style={{
              position: 'relative',
              display: 'inline-block',
              aspectRatio: '280/150',
              maxWidth: '100%',
              maxHeight: '100%'
            }}>
              <canvas
                ref={canvasRef}
                width={1400}
                height={750}
                className="simple-canvas"
                style={{
                  cursor: 'default', // 光标由 useEffect 统一管理
                  maxWidth: '100%',
                  height: 'auto'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={(e) => {
                  if (!dragState.isDragging && drawMode === 'bezier') {
                    handleMouseHover(e);
                  }
                  handleMouseMove(e);
                }}
                onMouseEnter={handleMouseHover}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              />
              {/* 旋转轴标识线（垂直）- 中心位置 x=140 */}
              <div style={{
                position: 'absolute',
                left: '140px',  // 280/2 = 140
                top: 0,
                bottom: 0,
                width: '1px',
                backgroundColor: 'rgb(94, 25, 25)',
                pointerEvents: 'none',
                transform: 'translateX(-0.5px)'
              }} />
              {/* 基准线标识线（水平）- 中心位置 y=75 */}
              <div style={{
                position: 'absolute',
                top: '75px',  // 150/2 = 75
                left: 0,
                right: 0,
                height: '1px',
                backgroundColor: 'rgb(94, 25, 25)',
                pointerEvents: 'none',
                transform: 'translateY(-0.5px)'
              }} />
            </div>
          </div>

          {/* 模态窗口底部控制栏 */}
          <div style={{
            marginTop: '20px',
            padding: '16px 20px',
            borderTop: '1px solid var(--fluent-border-light)',
            background: '#ffffff80',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div className="points-count" style={{
              fontSize: '14px',
              color: 'var(--fluent-text-secondary)',
              fontWeight: 500
            }}>
              {enableBezier && drawMode === 'free'
                ? `绘制点数：${freehandPoints.length}`
                : enableBezier && drawMode === 'bezier'
                  ? `锚点：${bezierAnchors.length}`
                  : `点数：${clickPoints.length}`}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={clearCanvas}
                disabled={readOnly}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 'var(--fluent-radius)',
                  background: readOnly ? '#cccccc' : '#ff6b6b',
                  color: '#fff',
                  cursor: readOnly ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'var(--fluent-transition)',
                  opacity: readOnly ? 0.6 : 1
                }}
              >
                清空
              </button>
              <button
                onClick={closeModal}
                style={{
                  padding: '8px 20px',
                  border: 'none',
                  borderRadius: 'var(--fluent-radius)',
                  background: 'var(--fluent-primary)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'var(--fluent-transition)'
                }}
              >
                完成
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );

    console.log('Portal 内容:', portalContent);
    return portalContent;
  };

  return (
    <div className={`simple-canvas-container ${className}`}>
      <div className="canvas-header">
        <h4>{title}</h4>
        <div className="header-buttons">
          {enableBezier && (
            <button
              className={`mode-btn ${drawMode === 'free' ? 'active free-mode' : drawMode === 'bezier' ? 'active' : ''}`}
              onClick={toggleDrawMode}
              disabled={readOnly}
              title="切换绘制模式（点绘 → 贝塞尔 → 自由绘制）"
              style={{ opacity: readOnly ? 0.5 : 1, cursor: readOnly ? 'not-allowed' : 'pointer' }}
            >
              {drawMode === 'free' ? '🖌️ 自由绘制' : drawMode === 'bezier' ? '🎨 贝塞尔' : '✏️ 点绘'}
            </button>
          )}
          {showFullScreen && (
            <button
              className="mode-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('全屏按钮被点击');
                openModal();
              }}
              title="全屏绘制"
              style={{ marginLeft: '6px' }}
            >
              ⛶ 全屏
            </button>
          )}
          <button className="clear-btn" onClick={clearCanvas} disabled={readOnly} style={{ opacity: readOnly ? 0.5 : 1, cursor: readOnly ? 'not-allowed' : 'pointer' }}>清空</button>
        </div>
      </div>

      {enableBezier && drawMode === 'free' && (
        <div className="bezier-hint">
          🖌️ 按住鼠标左键并拖动来绘制平滑曲线
        </div>
      )}
      {enableBezier && drawMode === 'bezier' && (
        <div className="bezier-hint">
          💡 点击添加锚点，拖拽红色手柄调整曲率，可移动锚点位置
        </div>
      )}

      <div className="equation-input-small">
        <input
          type="text"
          placeholder={equationPlaceholder}
          value={equation}
          onChange={(e) => setEquation(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && generateFromEquation()}
          disabled={readOnly}
          style={{ opacity: readOnly ? 0.5 : 1 }}
        />
        <button onClick={generateFromEquation} disabled={readOnly} style={{ opacity: readOnly ? 0.5 : 1 }}>生成</button>
      </div>

      <div style={{ position: 'relative', display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          width={280}
          height={150}
          className="simple-canvas"
          style={{
            cursor: 'default', // 光标由 useEffect 统一管理
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={(e) => {
            // 先执行悬停检测（只在非拖动状态下）
            if (!dragState.isDragging && drawMode === 'bezier') {
              handleMouseHover(e);
            }
            // 再执行绘制/拖动逻辑
            handleMouseMove(e);
          }}
          onMouseEnter={handleMouseHover}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
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
        {enableBezier && drawMode === 'free'
          ? `绘制点数：${freehandPoints.length}`
          : enableBezier && drawMode === 'bezier'
            ? `锚点：${bezierAnchors.length}`
            : `点数：${clickPoints.length}`}
      </div>

      {/* 渲染全屏模态窗口 */}
      {renderModalContent()}
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
          const x = (point.x - 140) / 4;   // canvas x -> 3D x
          const z = -(point.y - 75) / 4;   // canvas y -> 3D z
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
            // 注意：profilePoint.n 已经在坐标转换时处理过正负号，这里直接使用
            const X = factor * profilePoint.m * pathPoint.x;
            const Y = factor * profilePoint.n;
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
    ? currentChess?.parts?.base?.customShape
    : currentChess?.parts?.column?.customShape;

  const profilePoints = currentCustomShape?.profilePoints || [];
  const pathPoints = currentCustomShape?.pathPoints || [];

  // 当数据发生变化时通知父组件
  const handleProfileChange = useCallback((points) => {
    // 直接更新棋子数据
    if (handleDataUpdate) {
      console.log('正在更新异形数据：', `parts.${selectedComponent}.customShape.profilePoints`);
      handleDataUpdate(`parts.${selectedComponent}.customShape.profilePoints`, points);
    }
  }, [selectedComponent, handleDataUpdate]);

  const handlePathChange = useCallback((points) => {
    // 直接更新棋子数据
    if (handleDataUpdate) {
      console.log('正在更新异形数据：', `parts.${selectedComponent}.customShape.pathPoints`);
      handleDataUpdate(`parts.${selectedComponent}.customShape.pathPoints`, points);
    }
  }, [selectedComponent, handleDataUpdate]);

  return (
    <div className="custom-revolution-scroll-container">
      <div className="custom-revolution-panel">
        <div className="panel-section">
          <h3>异形生成器</h3>
          <p className="panel-description">绘制轮廓曲线生成自定义 3D 形状 - 支持点绘和贝塞尔曲线两种模式</p>
        </div>

        <div className="canvases-row">
          <SimpleCanvas
            title="轮廓曲线"
            onPointsChange={handleProfileChange}
            equationPlaceholder="例如：2*Math.sin(x)+1"
            className="profile-canvas"
            initialPoints={profilePoints}
            enableBezier={true}
          />

          <SimpleCanvas
            title="路径曲线 (可选)"
            onPointsChange={handlePathChange}
            equationPlaceholder="例如：Math.cos(x)"
            className="path-canvas"
            initialPoints={pathPoints}
            enableBezier={true}
          />
        </div>
      </div>
    </div>
  );
};

export default CustomRevolutionGenerator;