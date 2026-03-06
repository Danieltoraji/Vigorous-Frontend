import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './chess_editor.css';
import { useChess } from '../../hooks/useChess.jsx';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import ModelRenderer from './modelrenderer/modelrenderer.jsx';
import CustomRevolutionGenerator from '../../Components/CustomRevolutionGenerator/CustomRevolutionGenerator.jsx';


import { exportChessModel, generateExportFilename } from '../../utils/modelExporter.js';

function ChessEditor() {
  const { chessData, updateChess, setChessData, getChessById } = useChess();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: pieceId } = useParams();
  const [currentChess, setCurrentChess] = useState(null);
  const [customShapeData, setCustomShapeData] = useState({
    profilePoints: [],
    pathPoints: []
  });

  // 初始化 currentChess 状态 - 只在组件挂载时执行一次
  useEffect(() => {
    // 优先使用传入的棋子数据
    if (location.state?.piece) {
      setCurrentChess(location.state.piece);
    }
    // 然后尝试使用 chessData 中的第一个棋子
    else if (Object.keys(chessData).length > 0) {
      const chessValues = Object.values(chessData);
      setCurrentChess(chessValues[0]);
    }

  }, []); // 空依赖数组，只在挂载时执行一次

  const [selectedComponent, setSelectedComponent] = useState('base'); // 默认选中底座组件
  const [lastSaved, setLastSaved] = useState(new Date().toLocaleString());

  // 右侧面板固定宽度
  const [rightWidth, setRightWidth] = useState(400); // 右侧面板宽度
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false); // 右侧面板收起状态

  // 引用
  const editorContentRef = useRef(null);

  // 当chessData或location.state变化时更新currentChess
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('正在获取棋子：', pieceId);
        const fetchedData = await getChessById(pieceId);

        if (fetchedData) {
          console.log('获取成功：', fetchedData);
          setCurrentChess(fetchedData);
        }
      } catch (error) {
        console.error('获取失败:', error);
        alert(error.message);
        navigate(-1);
      }
    };

    if (pieceId) {
      fetchData();
    }
  }, [pieceId, navigate]);

  // 处理组件选择 - 使用 useCallback 避免重复创建
  const handleComponentSelect = useCallback((componentType) => {
    setSelectedComponent(componentType);
  }, []);

  // 处理数据更新 - 使用 useCallback 避免重复创建
  const handleDataUpdate = useCallback((path, value) => {
    if (!currentChess) return;

    // 深度克隆当前数据
    const updatedChess = JSON.parse(JSON.stringify(currentChess));
    console.log('正在更新棋子数据：', path, value);
    // 根据路径更新数据
    const keys = path.split('.');
    let target = updatedChess;

    for (let i = 0; i < keys.length - 1; i++) {
      // 确保中间对象存在
      if (!target[keys[i]]) {
        target[keys[i]] = {};
      }
      target = target[keys[i]];
    }

    target[keys[keys.length - 1]] = value;

    // 更新本地状态
    setCurrentChess(updatedChess);

    // 更新全局状态
    setChessData(prev => ({
      ...prev,
      [currentChess.id]: updatedChess
    }));
  }, [currentChess, setChessData]);

  // 处理保存 - 使用 useCallback
  const handleSave = useCallback(async () => {
    if (!currentChess) return;

    try {
      // 调用 updateChess 方法向后端保存数据
      await updateChess(currentChess.id, currentChess);

      // 更新保存时间
      setLastSaved(new Date().toLocaleString());
    } catch (error) {
      alert('保存失败：' + (error.message || '未知错误'));
    }
  }, [currentChess, updateChess]);

  // 处理右侧面板收起/展开
  const handleToggleRightPanel = useCallback(() => {
    setIsRightPanelCollapsed(prev => !prev);
  }, []);

  // 处理导出
  const handleExport = async () => {
    if (!currentChess) {
      alert('当前没有可导出的模型');
      return;
    }

    try {
      // 让用户选择导出格式
      const format = window.confirm('选择导出格式：\n点击"确定"导出 STL 格式（适合 3D 打印）\n点击"取消"导出 OBJ 格式（适合 3D 建模软件）')
        ? 'stl'
        : 'obj';

      // 显示加载提示
      alert(`正在准备导出${format.toUpperCase()}格式，请稍候...`);

      // 导出模型
      const blob = await exportChessModel(currentChess, format);

      // 生成文件名
      const filename = generateExportFilename(currentChess.name, format);

      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert(`导出成功！文件已下载：${filename}`);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败：' + (error.message || '未知错误'));
    }
  };

  // 处理返回
  const handleBack = () => {
    const projectId = currentChess.project;
    navigate(`/project-editor/${projectId}`);
  };

  // 拖拽处理函数
  const handleMouseDownLeft = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleMouseDownRight = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleMouseMove = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!editorContentRef.current) return;

    const containerRect = editorContentRef.current.getBoundingClientRect();




  }, []);
  const handleMouseUp = useCallback(() => {
    setIsDraggingLeft(false);
    setIsDraggingRight(false);
  }, []);


  // 添加全局鼠标事件监听器
  useEffect(() => {

  }, [handleMouseMove, handleMouseUp]);

  // 渲染底座组件参数面板 - 使用 useMemo 缓存
  const renderBasePanel = useMemo(() => () => {
    if (!currentChess || !currentChess.parts?.base) return null;

    const component = currentChess.parts.base;
    const shape = component.shape || {};
    const pattern = component.pattern || {};
    const edge = component.edge || {};

    const getSafeValue = (value, defaultValue) => {
      return value !== undefined && value !== null ? value : defaultValue;
    };

    return (
      <div className="data-editor">
        <h3>底座参数</h3>

        {/* Shape 部分 */}
        <div className="editor-section">
          <h4>形状</h4>

          <div className="editor-item">
            <label>类型：</label>
            <select
              value={getSafeValue(shape.type, 'cylinder')}
              onChange={(e) => handleDataUpdate('parts.base.shape.type', e.target.value)}
            >
              <option value="circle">圆柱</option>
              <option value="polygon">多边形 (3-32 边)</option>
              <option value="special">异形</option>
              <option value="cube">矩形</option>
            </select>
          </div>

          {/* 多边形边数控制 */}
          {shape.type === 'polygon' && (
            <div className="editor-item">
              <label>边数：</label>
              <input
                type="range"
                min="3"
                max="32"
                value={getSafeValue(shape.sides, 6)}
                onChange={(e) => handleDataUpdate('parts.base.shape.sides', parseInt(e.target.value))}
              />
              <input
                type="number"
                min="3"
                max="32"
                value={getSafeValue(shape.sides, 6)}
                onChange={(e) => handleDataUpdate('parts.base.shape.sides', parseInt(e.target.value))}
                className="number-input"
              />
            </div>
          )}

          {/* 异形类型控制 */}
          {shape.type === 'special' && (
            <div className="custom-revolution-wrapper">
              <CustomRevolutionGenerator
                currentChess={currentChess}
                selectedComponent={selectedComponent}
                handleDataUpdate={handleDataUpdate}
              />
            </div>
          )}

          {/* 圆柱/多边形/矩形的尺寸控制 */}
          {shape.type !== 'special' && (
            <>
              <div className="editor-item">
                <label>尺寸 1：</label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={getSafeValue(shape.size1, 15)}
                  onChange={(e) => handleDataUpdate('parts.base.shape.size1', parseInt(e.target.value))}
                />
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={getSafeValue(shape.size1, 15)}
                  onChange={(e) => handleDataUpdate('parts.base.shape.size1', parseInt(e.target.value))}
                  className="number-input"
                />
              </div>

              <div className="editor-item">
                <label>尺寸 2：</label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={getSafeValue(shape.size2, 15)}
                  onChange={(e) => handleDataUpdate('parts.base.shape.size2', parseInt(e.target.value))}
                />
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={getSafeValue(shape.size2, 15)}
                  onChange={(e) => handleDataUpdate('parts.base.shape.size2', parseInt(e.target.value))}
                  className="number-input"
                />
              </div>
            </>
          )}

          {shape.type === 'special' ? null : (
            <div className="editor-item">
              <label>高度：</label>
              <input
                type="range"
                min="0.1"
                max="20"
                step="0.1"
                value={getSafeValue(shape.height, 1)}
                onChange={(e) => handleDataUpdate('parts.base.shape.height', parseFloat(e.target.value))}
              />
              <input
                type="number"
                min="0.1"
                max="20"
                step="0.1"
                value={getSafeValue(shape.height, 1)}
                onChange={(e) => handleDataUpdate('parts.base.shape.height', parseFloat(e.target.value))}
                className="number-input"
              />
            </div>
          )}

        </div>

        {/* Pattern 部分 */}
        <div className="editor-section">
          <h4>图案</h4>

          <div className="editor-item">
            <label>形状：</label>
            <select
              value={getSafeValue(pattern.shape, 'text')}
              onChange={(e) => handleDataUpdate('parts.base.pattern.shape', e.target.value)}
            >
              <option value="none">无</option>
              <option value="text">文字</option>
              <option value="geometry">几何图形</option>
              <option value="strange">奇异图形</option>
            </select>
          </div>

          {getSafeValue(pattern.shape, 'text') === 'text' && (
            <div className="editor-item">
              <label>文本内容：</label>
              <input
                type="text"
                value={getSafeValue(pattern.content, '')}
                onChange={(e) => handleDataUpdate('parts.base.pattern.content', e.target.value)}
              />
            </div>
          )}

          {getSafeValue(pattern.shape, 'text') === 'geometry' && (
            <>
              <div className="editor-item">
                <label>几何形状：</label>
                <select
                  value={getSafeValue(pattern.geometryType, 'square')}
                  onChange={(e) => handleDataUpdate('parts.base.pattern.geometryType', e.target.value)}
                >
                  <option value="Cube">矩形</option>
                  <option value="Circle">圆形</option>
                  <option value="Polygon">多边形</option>
                  <option value="strange">奇异形状</option>
                </select>
              </div>

              {getSafeValue(pattern.geometryType, 'Cube') === 'Polygon' && (
                <div className="editor-item">
                  <label>边数：</label>
                  <input
                    type="range"
                    min="3"
                    max="12"
                    value={getSafeValue(pattern.sides, 6)}
                    onChange={(e) => handleDataUpdate('parts.base.pattern.sides', parseInt(e.target.value))}
                  />
                  <input
                    type="number"
                    min="3"
                    max="12"
                    value={getSafeValue(pattern.sides, 6)}
                    onChange={(e) => handleDataUpdate('parts.base.pattern.sides', parseInt(e.target.value))}
                    className="number-input"
                  />
                </div>
              )}
            </>
          )}

          <div className="editor-item">
            <label>尺寸：</label>
            <input
              type="range"
              min="0"
              max="16"
              step="0.1"
              value={getSafeValue(pattern.size, 10)}
              onChange={(e) => handleDataUpdate('parts.base.pattern.size', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="16"
              step="0.1"
              value={getSafeValue(pattern.size, 10)}
              onChange={(e) => handleDataUpdate('parts.base.pattern.size', parseFloat(e.target.value))}
              className="number-input"
            />
          </div>

          <div className="editor-item">
            <label>深度：</label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={getSafeValue(pattern.depth, 1)}
              onChange={(e) => handleDataUpdate('parts.base.pattern.depth', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={getSafeValue(pattern.depth, 1)}
              onChange={(e) => handleDataUpdate('parts.base.pattern.depth', parseFloat(e.target.value))}
              className="number-input"
            />
          </div>

          {/* 图案位置 */}
          <div className="editor-subsection">
            <h5>位置</h5>
            <div className="editor-item">
              <label>X：</label>
              <input
                type="range"
                min="-20"
                max="20"
                value={getSafeValue(pattern.position?.x, 0)}
                onChange={(e) => handleDataUpdate('parts.base.pattern.position.x', parseInt(e.target.value))}
              />
              <input
                type="number"
                min="-20"
                max="20"
                value={getSafeValue(pattern.position?.x, 0)}
                onChange={(e) => handleDataUpdate('parts.base.pattern.position.x', parseInt(e.target.value))}
                className="number-input"
              />
            </div>
            <div className="editor-item">
              <label>Z：</label>
              <input
                type="range"
                min="-20"
                max="20"
                value={getSafeValue(pattern.position?.z, 0)}
                onChange={(e) => handleDataUpdate('parts.base.pattern.position.z', parseInt(e.target.value))}
              />
              <input
                type="number"
                min="-20"
                max="20"
                value={getSafeValue(pattern.position?.z, 0)}
                onChange={(e) => handleDataUpdate('parts.base.pattern.position.z', parseInt(e.target.value))}
                className="number-input"
              />
            </div>
          </div>
        </div>

        {/* Edge 部分 */}
        <div className="editor-section">
          <h4>边缘处理</h4>

          <div className="editor-item">
            <button
              className={`edge-toggle-button ${edge.type === 'smooth' ? 'active' : ''}`}
              onClick={() => handleDataUpdate('parts.base.edge.type', edge.type === 'smooth' ? 'none' : 'smooth')}
            >
              {edge.type === 'smooth' ? '✓ 平滑已启用' : '启用平滑'}
            </button>
            <button
              className={`edge-toggle-button ${edge.type === 'round' ? 'active' : ''}`}
              onClick={() => handleDataUpdate('parts.base.edge.type', edge.type === 'round' ? 'none' : 'round')}
              style={{ marginLeft: '10px' }}
            >
              {edge.type === 'round' ? '✓ 圆滑已启用' : '启用圆滑'}
            </button>
          </div>

          {(edge.type === 'smooth' || edge.type === 'round') && (
            <>
              <div className="editor-item">
                <label>深度：</label>
                <input
                  type="range"
                  min="0"
                  max="0.25"
                  step="0.01"
                  value={getSafeValue(edge.depth, 0)}
                  onChange={(e) => handleDataUpdate('parts.base.edge.depth', parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.04"
                  value={(getSafeValue(edge.depth, 0) * 4).toFixed(2)}
                  onChange={(e) => handleDataUpdate('parts.base.edge.depth', parseFloat(e.target.value) / 4)}
                  className="number-input"
                />
              </div>

              <div className="editor-item">
                <label>分段数：</label>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={getSafeValue(edge.segments, 4)}
                  onChange={(e) => handleDataUpdate('parts.base.edge.segments', parseInt(e.target.value))}
                />
                <input
                  type="number"
                  min="1"
                  max="8"
                  step="1"
                  value={getSafeValue(edge.segments, 4)}
                  onChange={(e) => handleDataUpdate('parts.base.edge.segments', parseInt(e.target.value))}
                  className="number-input"
                />
              </div>
            </>
          )}
        </div>

        {/* Material 部分 */}
        <div className="editor-section">
          <h4>材质</h4>
          <div className="editor-item">
            <label>金属度：</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.base?.material?.metalness, 0.3)}
              onChange={(e) => handleDataUpdate('parts.base.material.metalness', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.base?.material?.metalness, 0.3)}
              onChange={(e) => handleDataUpdate('parts.base.material.metalness', parseFloat(e.target.value))}
              className="number-input"
            />
          </div>
          <div className="editor-item">
            <label>粗糙度：</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.base?.material?.roughness, 0.4)}
              onChange={(e) => handleDataUpdate('parts.base.material.roughness', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.base?.material?.roughness, 0.4)}
              onChange={(e) => handleDataUpdate('parts.base.material.roughness', parseFloat(e.target.value))}
              className="number-input"
            />
          </div>
          <div className="editor-item">
            <label>清漆层：</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.base?.material?.clearcoat, 0)}
              onChange={(e) => handleDataUpdate('parts.base.material.clearcoat', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.base?.material?.clearcoat, 0)}
              onChange={(e) => handleDataUpdate('parts.base.material.clearcoat', parseFloat(e.target.value))}
              className="number-input"
            />
          </div>
          <div className="editor-item">
            <label>清漆粗糙度：</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.base?.material?.clearcoatRoughness, 0)}
              onChange={(e) => handleDataUpdate('parts.base.material.clearcoatRoughness', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.base?.material?.clearcoatRoughness, 0)}
              onChange={(e) => handleDataUpdate('parts.base.material.clearcoatRoughness', parseFloat(e.target.value))}
              className="number-input"
            />
          </div>
        </div>
      </div>
    );
  }, [currentChess, handleDataUpdate, selectedComponent]);

  // 渲染柱体组件参数面板 - 使用 useMemo 缓存
  const renderColumnPanel = useMemo(() => () => {
    if (!currentChess || !currentChess.parts?.column) return null;

    const component = currentChess.parts.column;
    const shape = component.shape || {};
    const pattern = component.pattern || {};
    const edge = component.edge || {};
    const position = component.position || {};

    const getSafeValue = (value, defaultValue) => {
      return value !== undefined && value !== null ? value : defaultValue;
    };

    return (
      <div className="data-editor">
        <h3>柱体参数</h3>

        {/* Shape 部分 */}
        <div className="editor-section">
          <h4>形状</h4>

          <div className="editor-item">
            <label>类型：</label>
            <select
              value={getSafeValue(shape.type, 'cylinder')}
              onChange={(e) => handleDataUpdate('parts.column.shape.type', e.target.value)}
            >
              <option value="circle">圆柱</option>
              <option value="polygon">多边形 (3-32 边)</option>
              <option value="special">异形</option>
              <option value="cube">矩形</option>
            </select>
          </div>

          {/* 多边形边数控制 */}
          {shape.type === 'polygon' && (
            <div className="editor-item">
              <label>边数：</label>
              <input
                type="range"
                min="3"
                max="32"
                value={getSafeValue(shape.sides, 6)}
                onChange={(e) => handleDataUpdate('parts.column.shape.sides', parseInt(e.target.value))}
              />
              <input
                type="number"
                min="3"
                max="32"
                value={getSafeValue(shape.sides, 6)}
                onChange={(e) => handleDataUpdate('parts.column.shape.sides', parseInt(e.target.value))}
                className="number-input"
              />
            </div>
          )}

          {/* 异形类型控制 */}
          {shape.type === 'special' && (
            <div className="custom-revolution-wrapper">
              <CustomRevolutionGenerator
                currentChess={currentChess}
                selectedComponent={selectedComponent}
                handleDataUpdate={handleDataUpdate}
              />
            </div>
          )}

          {/* 圆柱/多边形/矩形的尺寸控制 */}
          {shape.type !== 'special' && (
            <>
              <div className="editor-item">
                <label>尺寸 1：</label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={getSafeValue(shape.size1, 10)}
                  onChange={(e) => handleDataUpdate('parts.column.shape.size1', parseInt(e.target.value))}
                />
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={getSafeValue(shape.size1, 10)}
                  onChange={(e) => handleDataUpdate('parts.column.shape.size1', parseInt(e.target.value))}
                  className="number-input"
                />
              </div>

              <div className="editor-item">
                <label>尺寸 2：</label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={getSafeValue(shape.size2, 10)}
                  onChange={(e) => handleDataUpdate('parts.column.shape.size2', parseInt(e.target.value))}
                />
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={getSafeValue(shape.size2, 10)}
                  onChange={(e) => handleDataUpdate('parts.column.shape.size2', parseInt(e.target.value))}
                  className="number-input"
                />
              </div>
            </>
          )}

          {shape.type === 'special' ? null : (
            <div className="editor-item">
              <label>高度：</label>
              <input
                type="range"
                min="1"
                max="100"
                step="0.5"
                value={getSafeValue(shape.height, 20)}
                onChange={(e) => handleDataUpdate('parts.column.shape.height', parseFloat(e.target.value))}
              />
              <input
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={getSafeValue(shape.height, 20)}
                onChange={(e) => handleDataUpdate('parts.column.shape.height', parseFloat(e.target.value))}
                className="number-input"
              />
            </div>
          )}
        </div>

        {/* Position 部分 */}
        <div className="editor-section">
          <h4>位置</h4>

          <div className="editor-item">
            <label>X：</label>
            <input
              type="range"
              min="-30"
              max="30"
              value={getSafeValue(position.x, 0)}
              onChange={(e) => handleDataUpdate('parts.column.position.x', parseInt(e.target.value))}
            />
            <input
              type="number"
              min="-30"
              max="30"
              value={getSafeValue(position.x, 0)}
              onChange={(e) => handleDataUpdate('parts.column.position.x', parseInt(e.target.value))}
              className="number-input"
            />
          </div>

          <div className="editor-item">
            <label>Y修正：</label>
            <input
              type="range"
              min="-30"
              max="30"
              value={getSafeValue(position.y, 1)}
              onChange={(e) => handleDataUpdate('parts.column.position.y', parseInt(e.target.value))}
            />
            <input
              type="number"
              min="-30"
              max="30"
              value={getSafeValue(position.y, 1)}
              onChange={(e) => handleDataUpdate('parts.column.position.y', parseInt(e.target.value))}
              className="number-input"
            />
          </div>

          <div className="editor-item">
            <label>Z：</label>
            <input
              type="range"
              min="-30"
              max="30"
              value={getSafeValue(position.z, 0)}
              onChange={(e) => handleDataUpdate('parts.column.position.z', parseInt(e.target.value))}
            />
            <input
              type="number"
              min="-30"
              max="30"
              value={getSafeValue(position.z, 0)}
              onChange={(e) => handleDataUpdate('parts.column.position.z', parseInt(e.target.value))}
              className="number-input"
            />
          </div>
        </div>

        {/* Side Treatment 部分 */}
        <div className="editor-section">
          <h4>侧面处理</h4>

          <div className="editor-item">
            <label>类型：</label>
            <select
              value={getSafeValue(component.sideTreatment, 'none')}
              onChange={(e) => handleDataUpdate('parts.column.sideTreatment', e.target.value)}
            >
              <option value="none">无</option>
              <option value="groove">凹槽</option>
            </select>
          </div>
        </div>

        {/* Pattern 部分 */}
        <div className="editor-section">
          <h4>图案</h4>

          <div className="editor-item">
            <label>形状：</label>
            <select
              value={getSafeValue(pattern.shape, 'text')}
              onChange={(e) => handleDataUpdate('parts.column.pattern.shape', e.target.value)}
            >
              <option value="none">无</option>
              <option value="text">文字</option>
              <option value="geometry">几何图形</option>
              <option value="strange">奇异图形</option>
            </select>
          </div>

          {getSafeValue(pattern.shape, 'text') === 'text' && (
            <div className="editor-item">
              <label>文本内容：</label>
              <input
                type="text"
                value={getSafeValue(pattern.content, '')}
                onChange={(e) => handleDataUpdate('parts.column.pattern.content', e.target.value)}
              />
            </div>
          )}

          {getSafeValue(pattern.shape, 'text') === 'geometry' && (
            <>
              <div className="editor-item">
                <label>几何形状：</label>
                <select
                  value={getSafeValue(pattern.geometryType, 'square')}
                  onChange={(e) => handleDataUpdate('parts.column.pattern.geometryType', e.target.value)}
                >
                  <option value="Cube">矩形</option>
                  <option value="Circle">圆形</option>
                  <option value="Polygon">多边形</option>
                  <option value="strange">奇异形状</option>
                </select>
              </div>

              {getSafeValue(pattern.geometryType, 'Cube') === 'Polygon' && (
                <div className="editor-item">
                  <label>边数：</label>
                  <input
                    type="range"
                    min="3"
                    max="12"
                    value={getSafeValue(pattern.sides, 6)}
                    onChange={(e) => handleDataUpdate('parts.column.pattern.sides', parseInt(e.target.value))}
                  />
                  <input
                    type="number"
                    min="3"
                    max="12"
                    value={getSafeValue(pattern.sides, 6)}
                    onChange={(e) => handleDataUpdate('parts.column.pattern.sides', parseInt(e.target.value))}
                    className="number-input"
                  />
                </div>
              )}
            </>
          )}

          <div className="editor-item">
            <label>尺寸：</label>
            <input
              type="range"
              min="0"
              max="16"
              step="0.1"
              value={getSafeValue(pattern.size, 10)}
              onChange={(e) => handleDataUpdate('parts.column.pattern.size', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="16"
              step="0.1"
              value={getSafeValue(pattern.size, 10)}
              onChange={(e) => handleDataUpdate('parts.column.pattern.size', parseFloat(e.target.value))}
              className="number-input"
            />
          </div>

          <div className="editor-item">
            <label>深度：</label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={getSafeValue(pattern.depth, 1)}
              onChange={(e) => handleDataUpdate('parts.column.pattern.depth', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={getSafeValue(pattern.depth, 1)}
              onChange={(e) => handleDataUpdate('parts.column.pattern.depth', parseFloat(e.target.value))}
              className="number-input"
            />
          </div>

          {/* 图案位置 */}
          <div className="editor-subsection">
            <h5>位置</h5>
            <div className="editor-item">
              <label>X：</label>
              <input
                type="range"
                min="-20"
                max="20"
                value={getSafeValue(pattern.position?.x, 0)}
                onChange={(e) => handleDataUpdate('parts.column.pattern.position.x', parseInt(e.target.value))}
              />
              <input
                type="number"
                min="-20"
                max="20"
                value={getSafeValue(pattern.position?.x, 0)}
                onChange={(e) => handleDataUpdate('parts.column.pattern.position.x', parseInt(e.target.value))}
                className="number-input"
              />
            </div>
            <div className="editor-item">
              <label>Z：</label>
              <input
                type="range"
                min="-20"
                max="20"
                value={getSafeValue(pattern.position?.z, 0)}
                onChange={(e) => handleDataUpdate('parts.column.pattern.position.z', parseInt(e.target.value))}
              />
              <input
                type="number"
                min="-20"
                max="20"
                value={getSafeValue(pattern.position?.z, 0)}
                onChange={(e) => handleDataUpdate('parts.column.pattern.position.z', parseInt(e.target.value))}
                className="number-input"
              />
            </div>
          </div>
        </div>

        {/* Edge 部分 */}
        <div className="editor-section">
          <h4>边缘处理</h4>

          <div className="editor-item">
            <button
              className={`edge-toggle-button ${edge.type === 'smooth' ? 'active' : ''}`}
              onClick={() => handleDataUpdate('parts.column.edge.type', edge.type === 'smooth' ? 'none' : 'smooth')}
            >
              {edge.type === 'smooth' ? '✓ 平滑已启用' : '启用平滑'}
            </button>
            <button
              className={`edge-toggle-button ${edge.type === 'round' ? 'active' : ''}`}
              onClick={() => handleDataUpdate('parts.column.edge.type', edge.type === 'round' ? 'none' : 'round')}
              style={{ marginLeft: '10px' }}
            >
              {edge.type === 'round' ? '✓ 圆滑已启用' : '启用圆滑'}
            </button>
          </div>

          {(edge.type === 'smooth' || edge.type === 'round') && (
            <>
              <div className="editor-item">
                <label>深度：</label>
                <input
                  type="range"
                  min="0"
                  max="0.25"
                  step="0.01"
                  value={getSafeValue(edge.depth, 0.2)}
                  onChange={(e) => handleDataUpdate('parts.column.edge.depth', parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.04"
                  value={(getSafeValue(edge.depth, 0.2) * 4).toFixed(2)}
                  onChange={(e) => handleDataUpdate('parts.column.edge.depth', parseFloat(e.target.value) / 4)}
                  className="number-input"
                />
              </div>

              <div className="editor-item">
                <label>分段数：</label>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={getSafeValue(edge.segments, 4)}
                  onChange={(e) => handleDataUpdate('parts.column.edge.segments', parseInt(e.target.value))}
                />
                <input
                  type="number"
                  min="1"
                  max="8"
                  step="1"
                  value={getSafeValue(edge.segments, 4)}
                  onChange={(e) => handleDataUpdate('parts.column.edge.segments', parseInt(e.target.value))}
                  className="number-input"
                />
              </div>
            </>
          )}
        </div>

        {/* Material 部分 */}
        <div className="editor-section">
          <h4>材质</h4>
          <div className="editor-item">
            <label>金属度：</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.column?.material?.metalness, 0.3)}
              onChange={(e) => handleDataUpdate('parts.column.material.metalness', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.column?.material?.metalness, 0.3)}
              onChange={(e) => handleDataUpdate('parts.column.material.metalness', parseFloat(e.target.value))}
              className="number-input"
            />
          </div>
          <div className="editor-item">
            <label>粗糙度：</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.column?.material?.roughness, 0.4)}
              onChange={(e) => handleDataUpdate('parts.column.material.roughness', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.column?.material?.roughness, 0.4)}
              onChange={(e) => handleDataUpdate('parts.column.material.roughness', parseFloat(e.target.value))}
              className="number-input"
            />
          </div>
          <div className="editor-item">
            <label>清漆层：</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.column?.material?.clearcoat, 0)}
              onChange={(e) => handleDataUpdate('parts.column.material.clearcoat', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.column?.material?.clearcoat, 0)}
              onChange={(e) => handleDataUpdate('parts.column.material.clearcoat', parseFloat(e.target.value))}
              className="number-input"
            />
          </div>
          <div className="editor-item">
            <label>清漆粗糙度：</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.column?.material?.clearcoatRoughness, 0)}
              onChange={(e) => handleDataUpdate('parts.column.material.clearcoatRoughness', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.column?.material?.clearcoatRoughness, 0)}
              onChange={(e) => handleDataUpdate('parts.column.material.clearcoatRoughness', parseFloat(e.target.value))}
              className="number-input"
            />
          </div>
        </div>
      </div>
    );
  }, [currentChess, handleDataUpdate, selectedComponent]);

  // 渲染装饰组件参数面板 - 使用 useMemo 缓存
  const renderDecorationPanel = useMemo(() => () => {
    if (!currentChess || !currentChess.parts?.decoration) return null;

    const component = currentChess.parts.decoration;
    const size = component.size || {};
    const position = component.position || {};
    const rotation = component.rotation || {};

    const getSafeValue = (value, defaultValue) => {
      return value !== undefined && value !== null ? value : defaultValue;
    };

    return (
      <div className="data-editor">
        <h3>装饰参数</h3>

        {/* 模型导入按钮 */}
        <div className="editor-section">
          <h4>模型</h4>
          <div className="editor-item">
            <label>模型 ID：</label>
            <input
              type="text"
              value={getSafeValue(component.modelId, '')}
              onChange={(e) => handleDataUpdate('parts.decoration.modelId', e.target.value)}
              placeholder="输入模型 ID"
            />
          </div>
          <div className="editor-item">
            <button className="import-model-button">
              导入模型
            </button>
          </div>
        </div>

        {/* Size 部分 */}
        <div className="editor-section">
          <h4>尺寸</h4>

          <div className="editor-item">
            <label>尺寸 1：</label>
            <input
              type="range"
              min="0"
              max="30"
              value={getSafeValue(size.size1, 5)}
              onChange={(e) => handleDataUpdate('parts.decoration.size.size1', parseInt(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="30"
              value={getSafeValue(size.size1, 5)}
              onChange={(e) => handleDataUpdate('parts.decoration.size.size1', parseInt(e.target.value))}
              className="number-input"
            />
          </div>

          <div className="editor-item">
            <label>尺寸 2：</label>
            <input
              type="range"
              min="0"
              max="30"
              value={getSafeValue(size.size2, 5)}
              onChange={(e) => handleDataUpdate('parts.decoration.size.size2', parseInt(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="30"
              value={getSafeValue(size.size2, 5)}
              onChange={(e) => handleDataUpdate('parts.decoration.size.size2', parseInt(e.target.value))}
              className="number-input"
            />
          </div>

          <div className="editor-item">
            <label>尺寸 3：</label>
            <input
              type="range"
              min="0"
              max="20"
              value={getSafeValue(size.size3, 5)}
              onChange={(e) => handleDataUpdate('parts.decoration.size.size3', parseInt(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="20"
              value={getSafeValue(size.size3, 5)}
              onChange={(e) => handleDataUpdate('parts.decoration.size.size3', parseInt(e.target.value))}
              className="number-input"
            />
          </div>
        </div>

        {/* Position 部分 */}
        <div className="editor-section">
          <h4>位置</h4>

          <div className="editor-item">
            <label>X：</label>
            <input
              type="range"
              min="-50"
              max="50"
              value={getSafeValue(position.x, 0)}
              onChange={(e) => handleDataUpdate('parts.decoration.position.x', parseInt(e.target.value))}
            />
            <input
              type="number"
              min="-50"
              max="50"
              value={getSafeValue(position.x, 0)}
              onChange={(e) => handleDataUpdate('parts.decoration.position.x', parseInt(e.target.value))}
              className="number-input"
            />
          </div>

          <div className="editor-item">
            <label>Y：</label>
            <input
              type="range"
              min="-50"
              max="50"
              value={getSafeValue(position.y, 21)}
              onChange={(e) => handleDataUpdate('parts.decoration.position.y', parseInt(e.target.value))}
            />
            <input
              type="number"
              min="-50"
              max="50"
              value={getSafeValue(position.y, 21)}
              onChange={(e) => handleDataUpdate('parts.decoration.position.y', parseInt(e.target.value))}
              className="number-input"
            />
          </div>

          <div className="editor-item">
            <label>Z：</label>
            <input
              type="range"
              min="-50"
              max="50"
              value={getSafeValue(position.z, 0)}
              onChange={(e) => handleDataUpdate('parts.decoration.position.z', parseInt(e.target.value))}
            />
            <input
              type="number"
              min="-50"
              max="50"
              value={getSafeValue(position.z, 0)}
              onChange={(e) => handleDataUpdate('parts.decoration.position.z', parseInt(e.target.value))}
              className="number-input"
            />
          </div>
        </div>

        {/* Rotation 部分 */}
        <div className="editor-section">
          <h4>旋转</h4>

          <div className="editor-item">
            <label>X 轴：</label>
            <input
              type="range"
              min="0"
              max="360"
              value={getSafeValue(rotation.x, 0)}
              onChange={(e) => handleDataUpdate('parts.decoration.rotation.x', parseInt(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="360"
              value={getSafeValue(rotation.x, 0)}
              onChange={(e) => handleDataUpdate('parts.decoration.rotation.x', parseInt(e.target.value))}
              className="number-input"
            />
          </div>

          <div className="editor-item">
            <label>Y 轴：</label>
            <input
              type="range"
              min="0"
              max="360"
              value={getSafeValue(rotation.y, 0)}
              onChange={(e) => handleDataUpdate('parts.decoration.rotation.y', parseInt(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="360"
              value={getSafeValue(rotation.y, 0)}
              onChange={(e) => handleDataUpdate('parts.decoration.rotation.y', parseInt(e.target.value))}
              className="number-input"
            />
          </div>

          <div className="editor-item">
            <label>Z 轴：</label>
            <input
              type="range"
              min="0"
              max="360"
              value={getSafeValue(rotation.z, 0)}
              onChange={(e) => handleDataUpdate('parts.decoration.rotation.z', parseInt(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="360"
              value={getSafeValue(rotation.z, 0)}
              onChange={(e) => handleDataUpdate('parts.decoration.rotation.z', parseInt(e.target.value))}
              className="number-input"
            />
          </div>
        </div>

        {/* Material 部分 */}
        <div className="editor-section">
          <h4>材质</h4>
          <div className="editor-item">
            <label>金属度：</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.decoration?.material?.metalness, 0.5)}
              onChange={(e) => handleDataUpdate('parts.decoration.material.metalness', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.decoration?.material?.metalness, 0.5)}
              onChange={(e) => handleDataUpdate('parts.decoration.material.metalness', parseFloat(e.target.value))}
              className="number-input"
            />
          </div>
          <div className="editor-item">
            <label>粗糙度：</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.decoration?.material?.roughness, 0.3)}
              onChange={(e) => handleDataUpdate('parts.decoration.material.roughness', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.decoration?.material?.roughness, 0.3)}
              onChange={(e) => handleDataUpdate('parts.decoration.material.roughness', parseFloat(e.target.value))}
              className="number-input"
            />
          </div>
          <div className="editor-item">
            <label>清漆层：</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.decoration?.material?.clearcoat, 0)}
              onChange={(e) => handleDataUpdate('parts.decoration.material.clearcoat', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.decoration?.material?.clearcoat, 0)}
              onChange={(e) => handleDataUpdate('parts.decoration.material.clearcoat', parseFloat(e.target.value))}
              className="number-input"
            />
          </div>
          <div className="editor-item">
            <label>清漆粗糙度：</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.decoration?.material?.clearcoatRoughness, 0)}
              onChange={(e) => handleDataUpdate('parts.decoration.material.clearcoatRoughness', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentChess.parts?.decoration?.material?.clearcoatRoughness, 0)}
              onChange={(e) => handleDataUpdate('parts.decoration.material.clearcoatRoughness', parseFloat(e.target.value))}
              className="number-input"
            />
          </div>
        </div>
      </div>
    );
  }, [currentChess, handleDataUpdate]);

  // 如果 currentChess 还没有准备好，显示加载状态
  if (!currentChess) {
    return (
      <div className="chess-editor" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>加载中...</h2>
          <p>正在准备棋子数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chess-editor">
      {/* 顶部标题栏 */}
      <header className="editor-header">
        <div className="header-left">
          <button className="back-button" onClick={handleBack}>← 返回</button>
          <h1 className="chess-name">{currentChess?.name || '棋子编辑器'}</h1>
          <span className="last-saved">上次保存：{lastSaved}</span>
        </div>
        <div className="header-right">
          <button className="save-button" onClick={handleSave}>保存</button>
          <button className="export-button" onClick={handleExport}>导出</button>
        </div>
      </header>

      <div className="editor-content" ref={editorContentRef}>
        {/* 左侧组件选择面板 */}
        <aside className="part-selector" >
          <h3>组件选择</h3>
          <div className="part-buttons">
            <button
              className={`part-button ${selectedComponent === 'base' ? 'active' : ''}`}
              onClick={() => handleComponentSelect('base')}
            >
              底座
            </button>
            <button
              className={`part-button ${selectedComponent === 'column' ? 'active' : ''}`}
              onClick={() => handleComponentSelect('column')}
            >
              柱体
            </button>
            <button
              className={`part-button ${selectedComponent === 'decoration' ? 'active' : ''}`}
              onClick={() => handleComponentSelect('decoration')}
            >
              装饰
            </button>
            {/* 左侧组件选择 - 三个半透明小方块 */}
            <div className="component-squares">
              <div
                className={`square ${selectedComponent === 'base' ? 'active' : ''}`}
                onClick={() => handleComponentSelect('base')}
                title="底座"
              >
                <span className="square-label">底座</span>
              </div>
              <div
                className={`square ${selectedComponent === 'column' ? 'active' : ''}`}
                onClick={() => handleComponentSelect('column')}
                title="柱体"
              >
                <span className="square-label">柱体</span>
              </div>
              <div
                className={`square ${selectedComponent === 'decoration' ? 'active' : ''}`}
                onClick={() => handleComponentSelect('decoration')}
                title="装饰"
              >
                <span className="square-label">装饰</span>
              </div>
            </div>
          </div>
        </aside>


      </div>

      {/* 中间预览区域 */}
      <main className="preview-area">
        <ModelRenderer chess={currentChess} />
      </main>



      {/* 右侧面板切换按钮 */}
      <button
        className={`toggle-right-panel ${isRightPanelCollapsed ? 'collapsed' : 'expanded'}`}
        onClick={handleToggleRightPanel}
        title={isRightPanelCollapsed ? '展开面板' : '收起面板'}
      >
        {isRightPanelCollapsed ? '◀' : '▶'}
      </button>

      {/* 右侧数据调节面板 */}
      <aside className={`data-panel ${isRightPanelCollapsed ? 'collapsed' : ''}`} style={{ width: `${isRightPanelCollapsed ? 0 : rightWidth}px` }}>
        {selectedComponent === 'base' && renderBasePanel()}
        {selectedComponent === 'column' && renderColumnPanel()}
        {selectedComponent === 'decoration' && renderDecorationPanel()}
      </aside>
    </div>
  );
}

export default ChessEditor;