import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './chess_editor.css';
import { useChess } from '../../hooks/useChess.jsx';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import ModelRenderer from './modelrenderer/modelrenderer.jsx';
import CustomRevolutionGenerator from '../../Components/CustomRevolutionGenerator/CustomRevolutionGenerator.jsx';

import { exportScene, downloadBlob, generateExportFilename } from '../../utils/exportScene.js';
function ChessEditor() {
  const { chessData, updateChess, setChessData, getChessById } = useChess();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: pieceId } = useParams();
  const [currentChess, setCurrentChess] = useState(null);


  // Reference to the model root group for export
  const modelRootRef = useRef(null);



  const [selectedComponent, setSelectedComponent] = useState('base'); // 默认选中底座组件
  const [lastSaved, setLastSaved] = useState(new Date().toLocaleString());

  // 右侧面板固定宽度
  const [rightWidth, setRightWidth] = useState(400); // 右侧面板宽度
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false); // 右侧面板收起状态
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false); // 左侧面板收起状态
  const [showExportModal, setShowExportModal] = useState(false); // 导出窗口显示状态

  // 引用
  const editorContentRef = useRef(null);

  // 当chessData或location.state变化时更新currentChess
  
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
  useEffect(() => {
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

  // 处理左侧面板收起/展开
  const handleToggleLeftPanel = useCallback(() => {
    setIsLeftPanelCollapsed(prev => !prev);
  }, []);

  // 处理导出：点击导出按键，弹出导出窗口
  const handleExport = () => {
    if (!currentChess) {
      alert('当前没有可导出的模型');
      return;
    }
    setShowExportModal(true);
  };

  // 处理具体的导出操作：在导出窗口选择导出方式之后，进行导出
  const handleExportAction = async (format) => {
    try {
      // 导出前先保存当前修改，然后获取最新数据
      await handleSave();
      await fetchData();
      
      let blob;
      let filename;
      
      // 调用导出函数，直接传递参数
      console.log('正在做导出准备,json',currentChess,'stl/obj',modelRootRef.current);
      blob = await exportScene(currentChess, modelRootRef.current, format);
      filename = generateExportFilename(currentChess.name, format);
      downloadBlob(blob, filename);

      alert(`导出成功！文件已下载：${filename}`);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败：' + (error.message || '未知错误'));
    } finally {
      setShowExportModal(false);
    }
  };

  // 处理返回
  const handleBack = () => {
    const projectId = currentChess.project;
    navigate(`/project-editor/${projectId}`);
  };

  // Handle model ready callback - receives the Three.js Group containing the chess model
  const handleModelReady = useCallback((modelRoot) => {
    modelRootRef.current = modelRoot;
    console.log('Model ready for export:', modelRoot);
  }, []);

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
              <option value="cycle">圆柱</option>
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
              <label>Y修正：</label>
              <input
                type="range"
                min="-20"
                max="20"
                value={getSafeValue(pattern.position?.y, 0)}
                onChange={(e) => handleDataUpdate('parts.base.pattern.position.y', parseInt(e.target.value))}
              />
              <input
                type="number"
                min="-20"
                max="20"
                value={getSafeValue(pattern.position?.y, 0)}
                onChange={(e) => handleDataUpdate('parts.base.pattern.position.y', parseInt(e.target.value))}
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
              <option value="cycle">圆柱</option>
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
              <label>Y修正：</label>
              <input
                type="range"
                min="-20"
                max="20"
                value={getSafeValue(pattern.position?.y, 0)}
                onChange={(e) => handleDataUpdate('parts.column.pattern.position.y', parseInt(e.target.value))}
              />
              <input
                type="number"
                min="-20"
                max="20"
                value={getSafeValue(pattern.position?.y, 0)}
                onChange={(e) => handleDataUpdate('parts.column.pattern.position.y', parseInt(e.target.value))}
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
            <label>模型类型：</label>
            <select
              value={getSafeValue(component.modelId, '0')}
              onChange={(e) => handleDataUpdate('parts.decoration.modelId', e.target.value)}
            >
              <option value="0">无装饰</option>
              <option value="1">小旗子</option>
              <option value="2">五角星</option>
              <option value="3">圆球</option>
              <option value="4">四棱锥</option>
              <option value="0">未来会支持更多预设和用户导入...</option>
            </select>
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

        {/* 中间预览区域 */}
        <main className="preview-area">
          <ModelRenderer chess={currentChess} onModelReady={handleModelReady} />
        </main>

      </div>



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

      {/* 导出窗口 */}
      {showExportModal && (
        <div className="modal-overlay">
          <div className="export-modal">
            <div className="modal-header">
              <h2>导出模型</h2>
              <button className="close-button" onClick={() => setShowExportModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-content">
              <p>请选择导出方式：</p>
              <div className="export-buttons">
                <button
                  className="export-option-button"
                  onClick={() => handleExportAction('json')}
                >
                  JSON数据
                </button>
                <button
                  className="export-option-button"
                  onClick={() => handleExportAction('stl')}
                >
                  STL（适合3D打印）
                </button>
                <button
                  className="export-option-button"
                  onClick={() => handleExportAction('obj')}
                >
                  OBJ（适合3D建模软件）
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChessEditor;