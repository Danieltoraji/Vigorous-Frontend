import React, { useState, useEffect, useRef } from 'react';
import './chess_editor.css';
import { useChess } from '../../hooks/useChess.jsx';
import { useNavigate } from 'react-router-dom';
import ModelRenderer from './modelrenderer/modelrenderer.jsx';

function ChessEditor() {
  const { chessData, updateChess, setChessData } = useChess();
  const navigate = useNavigate();
  const [currentChess, setCurrentChess] = useState(chessData[20001] || null);
  const [selectedPart, setSelectedPart] = useState('1'); // 默认选中
  const [lastSaved, setLastSaved] = useState(new Date().toLocaleString());
  
  // 拖拽相关状态
  const [leftWidth, setLeftWidth] = useState(200); // 左侧面板宽度
  const [rightWidth, setRightWidth] = useState(350); // 右侧面板宽度
  const [isDraggingLeft, setIsDraggingLeft] = useState(false); // 左侧拖拽状态
  const [isDraggingRight, setIsDraggingRight] = useState(false); // 右侧拖拽状态
  
  // 引用
  const editorContentRef = useRef(null);

  // 当chessData变化时更新currentChess
  useEffect(() => {
    if (chessData[20001]) {
      setCurrentChess(chessData[20001]);
    }
  }, [chessData]);

  // 处理部件选择
  const handlePartSelect = (partIndex) => {
    setSelectedPart(partIndex);
  };

  // 处理数据更新
  const handleDataUpdate = (path, value) => {
    if (!currentChess) return;

    // 深度克隆当前数据
    const updatedChess = JSON.parse(JSON.stringify(currentChess));
    
    // 根据路径更新数据
    const keys = path.split('.');
    let target = updatedChess;
    
    for (let i = 0; i < keys.length - 1; i++) {
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
  };

  // 处理保存
  const handleSave = async () => {
    if (!currentChess) return;
    
    try {
      // 调用updateChess方法向后端保存数据
      await updateChess(currentChess.id, currentChess);
      
      // 更新保存时间
      setLastSaved(new Date().toLocaleString());
      alert('保存成功！');
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败：' + (error.message || '未知错误'));
    }
  };

  // 处理导出
  const handleExport = () => {
    alert('开发中');
  };

  // 处理返回
  const handleBack = () => {
    navigate('/');
  };
  
  // 拖拽处理函数
  const handleMouseDownLeft = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLeft(true);
  };
  
  const handleMouseDownRight = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingRight(true);
  };
  
  const handleMouseMove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!editorContentRef.current) return;
    
    const containerRect = editorContentRef.current.getBoundingClientRect();
    
    if (isDraggingLeft) {
      const newWidth = e.clientX - containerRect.left;
      // 设置最小和最大宽度限制
      if (newWidth >= 150 && newWidth <= 300) {
        setLeftWidth(newWidth);
      }
    }
    
    if (isDraggingRight) {
      const newWidth = containerRect.right - e.clientX;
      // 设置最小和最大宽度限制
      if (newWidth >= 250 && newWidth <= 450) {
        setRightWidth(newWidth);
      }
    }
  };
  
  const handleMouseUp = () => {
    setIsDraggingLeft(false);
    setIsDraggingRight(false);
  };
  
  // 添加全局鼠标事件监听器
  useEffect(() => {
    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingLeft, isDraggingRight]);

  // 渲染数据编辑控件
  const renderDataEditor = () => {
    if (!currentChess || !currentChess.parts[selectedPart]) return null;

    const partData = currentChess.parts[selectedPart];
    
    const getSafeValue = (value, defaultValue) => {// 安全获取值，处理undefined和null的情况。当值为null或undefined时，返回默认值。
      return value !== undefined && value !== null ? value : defaultValue;
    };
    
    const shape = partData.Shape || {};
    const shapePosition = shape.position || {};
    const texture = partData.Texture || {};
    const texturePosition = texture.position || {};
    const text = partData.Text || {};
    const textPosition = text.position || {};
    
    const partnames = ['基座层','地面层','支撑杆','空中层']

    return (
      <div className="data-editor">
        <h3>参数调节</h3>
        <h2>{selectedPart} {partnames[selectedPart-1]}</h2>
        
        {/* Appear开关 */}
        <div style={{ marginTop: '10px' }}></div>
        <div className="editor-item">
          <label>启用：</label>
          <div className="toggle-switch">
            <input 
              type="checkbox" 
              id={`appear-toggle-${selectedPart}`}
              checked={partData.Appear === "True"}
              onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Appear`, e.target.checked ? "True" : "False")}
            />
            <label htmlFor={`appear-toggle-${selectedPart}`} className="toggle-label"></label>
          </div>
        </div>

        {/* Shape部分 */}
        <div className={`editor-section ${partData.Appear === "True" ? "visible" : "hidden"}`}>
          <h4>形状</h4>
          
          <div className="editor-item">
            <label>类型：</label>
            <select 
              value={getSafeValue(shape.type, 'Circle')} 
              onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Shape.type`, e.target.value)}
            >
              <option value="Circle">圆形</option>
              <option value="Square">正方形</option>
              <option value="Rectangle">矩形</option>
              <option value="Triangle">三角形</option>
              <option value="Hexagon">六边形</option>
            </select>
          </div>

          <div className="editor-item">
            <label>X大小：</label>
            <input 
              type="range" 
              min="1" 
              max="50" 
              value={getSafeValue(shape.size1, 15)} 
              onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Shape.size1`, parseInt(e.target.value))}
            />
            <input 
              type="number" 
              min="1" 
              max="50" 
              value={getSafeValue(shape.size1, 15)} 
              onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Shape.size1`, parseInt(e.target.value))}
              className="number-input"
            />
          </div>

          <div className="editor-item">
            <label>Z大小（仅对矩形生效）：</label>
            <input 
              type="range" 
              min="1" 
              max="50" 
              value={getSafeValue(shape.size2, 15)} 
              onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Shape.size2`, parseInt(e.target.value))}
            />
            <input 
              type="number" 
              min="1" 
              max="50" 
              value={getSafeValue(shape.size2, 15)} 
              onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Shape.size2`, parseInt(e.target.value))}
              className="number-input"
            />
          </div>

          <div className="editor-item">
            <label>高度：</label>
            <input 
              type="range" 
              min="0.1" 
              max="20" 
              step="0.1" 
              value={getSafeValue(shape.height, 1)} 
              onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Shape.height`, parseFloat(e.target.value))}
            />
            <input 
              type="number" 
              min="0.1" 
              max="20" 
              step="0.1" 
              value={getSafeValue(shape.height, 1)} 
              onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Shape.height`, parseFloat(e.target.value))}
              className="number-input"
            />
          </div>

          <div className="editor-item">
            <label>颜色：</label>
            <input 
              type="color" 
              value={getSafeValue(shape.color, '#FF0000')} 
              onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Shape.color`, e.target.value)}
              className="color-picker"
            />
            <input 
              type="text" 
              value={getSafeValue(shape.color, '#FF0000')} 
              onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Shape.color`, e.target.value.startsWith('#') ? e.target.value.toUpperCase() : '#' + e.target.value.toUpperCase())}
              className="color-input"
            />
          </div>

          {/* 位置 */}
          <div className="editor-subsection">
            <h5>位置</h5>
            <div className="editor-item">
              <label>X：</label>
              <input 
                type="range" 
                min="-50" 
                max="50" 
                value={getSafeValue(shapePosition.x, 0)} 
                onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Shape.position.x`, parseInt(e.target.value))}
              />
              <input 
                type="number" 
                min="-50" 
                max="50" 
                value={getSafeValue(shapePosition.x, 0)} 
                onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Shape.position.x`, parseInt(e.target.value))}
                className="number-input"
              />
            </div>
            <div className="editor-item">
              <label>Y：</label>
              <input 
                type="range" 
                min="-50" 
                max="50" 
                value={getSafeValue(shapePosition.y, 0)} 
                onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Shape.position.y`, parseInt(e.target.value))}
              />
              <input 
                type="number" 
                min="-50" 
                max="50" 
                value={getSafeValue(shapePosition.y, 0)} 
                onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Shape.position.y`, parseInt(e.target.value))}
                className="number-input"
              />
            </div>
            <div className="editor-item">
              <label>Z：</label>
              <input 
                type="range" 
                min="-50" 
                max="50" 
                value={getSafeValue(shapePosition.z, 0)} 
                onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Shape.position.z`, parseInt(e.target.value))}
              />
              <input 
                type="number" 
                min="-50" 
                max="50" 
                value={getSafeValue(shapePosition.z, 0)} 
                onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Shape.position.z`, parseInt(e.target.value))}
                className="number-input"
              />
            </div>
          </div>
        </div>

        {/* Texture部分 */}
        <div className={`editor-section ${partData.Appear === "True" ? "visible" : "hidden"}`}>
          <h4>贴图</h4>
          <div className="editor-item">
            <label>文件：</label>
            <input 
              type="text" 
              value={getSafeValue(texture.file, '')} 
              onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Texture.file`, e.target.value)}
            />
          </div>
          <div className="editor-item">
            <label>缩放：</label>
            <input 
              type="range" 
              min="0.1" 
              max="5" 
              step="0.1" 
              value={getSafeValue(texture.zoom, 1)} 
              onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Texture.zoom`, parseFloat(e.target.value))}
            />
            <input 
              type="number" 
              min="0.1" 
              max="5" 
              step="0.1" 
              value={getSafeValue(texture.zoom, 1)} 
              onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Texture.zoom`, parseFloat(e.target.value))}
              className="number-input"
            />
          </div>
          {/* 位置 */}
          <div className="editor-subsection">
            <h5>位置</h5>
            <div className="editor-item">
              <label>X：</label>
              <input 
                type="range" 
                min="-50" 
                max="50" 
                value={getSafeValue(texturePosition.x, 0)} 
                onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Texture.position.x`, parseInt(e.target.value))}
              />
              <input 
                type="number" 
                min="-50" 
                max="50" 
                value={getSafeValue(texturePosition.x, 0)} 
                onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Texture.position.x`, parseInt(e.target.value))}
                className="number-input"
              />
            </div>
            <div className="editor-item">
              <label>Y：</label>
              <input 
                type="range" 
                min="-50" 
                max="50" 
                value={getSafeValue(texturePosition.y, 0)} 
                onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Texture.position.y`, parseInt(e.target.value))}
              />
              <input 
                type="number" 
                min="-50" 
                max="50" 
                value={getSafeValue(texturePosition.y, 0)} 
                onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Texture.position.y`, parseInt(e.target.value))}
                className="number-input"
              />
            </div>
          </div>
        </div>

        {/* Text部分 */}
        <div className={`editor-section ${partData.Appear === "True" ? "visible" : "hidden"}`}>
          <h4>文字</h4>
          <div className="editor-item">
            <label>内容：</label>
            <input 
              type="text" 
              value={getSafeValue(text.content, '')} 
              onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Text.content`, e.target.value)}
            />
          </div>
          <div className="editor-item">
            <label>大小：</label>
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={getSafeValue(text.size, 10)} 
              onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Text.size`, parseInt(e.target.value))}
            />
            <input 
              type="number" 
              min="1" 
              max="20" 
              value={getSafeValue(text.size, 10)} 
              onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Text.size`, parseInt(e.target.value))}
              className="number-input"
            />
          </div>
          <div className="editor-item">
            <label>颜色：</label>
            <input 
              type="color" 
              value={getSafeValue(text.color || text.Color, '#FFFFFF')} 
              onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Text.color`, e.target.value)}
              className="color-picker"
            />
            <input 
              type="text" 
              value={getSafeValue(text.color || text.Color, '#FFFFFF')} 
              onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Text.color`, e.target.value.startsWith('#') ? e.target.value.toUpperCase() : '#' + e.target.value.toUpperCase())}
              className="color-input"
            />
          </div>
          <div className="editor-item">
            <label>高度：</label>
            <input 
              type="range" 
              min="0.1" 
              max="5" 
              step="0.1" 
              value={getSafeValue(text.height, 1)} 
              onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Text.height`, parseFloat(e.target.value))}
            />
            <input 
              type="number" 
              min="0.1" 
              max="5" 
              step="0.1" 
              value={getSafeValue(text.height, 1)} 
              onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Text.height`, parseFloat(e.target.value))}
              className="number-input"
            />
          </div>
          {/* 位置 */}
          <div className="editor-subsection">
            <h5>位置</h5>
            <div className="editor-item">
              <label>X：</label>
              <input 
                type="range" 
                min="-50" 
                max="50" 
                value={getSafeValue(textPosition.x, 0)} 
                onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Text.position.x`, parseInt(e.target.value))}
              />
              <input 
                type="number" 
                min="-50" 
                max="50" 
                value={getSafeValue(textPosition.x, 0)} 
                onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Text.position.x`, parseInt(e.target.value))}
                className="number-input"
              />
            </div>
            <div className="editor-item">
              <label>Y：</label>
              <input 
                type="range" 
                min="-50" 
                max="50" 
                value={getSafeValue(textPosition.y, 0)} 
                onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Text.position.y`, parseInt(e.target.value))}
              />
              <input 
                type="number" 
                min="-50" 
                max="50" 
                value={getSafeValue(textPosition.y, 0)} 
                onChange={(e) => handleDataUpdate(`parts.${selectedPart}.Text.position.y`, parseInt(e.target.value))}
                className="number-input"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

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
        {/* 左侧部件选择面板 */}
        <aside className="part-selector" style={{ width: `${leftWidth}px` }}>
          <h3>部件选择</h3>
          <div className="part-buttons">
            <button 
              className={`part-button ${selectedPart === '4' ? 'active' : ''}`}
              onClick={() => handlePartSelect('4')}
            >
              空中层
            </button>
            <button 
              className={`part-button ${selectedPart === '3' ? 'active' : ''}`}
              onClick={() => handlePartSelect('3')}
            >
              支撑杆
            </button>
            <button 
              className={`part-button ${selectedPart === '2' ? 'active' : ''}`}
              onClick={() => handlePartSelect('2')}
            >
              地面层
            </button>
            <button 
              className={`part-button ${selectedPart === '1' ? 'active' : ''}`}
              onClick={() => handlePartSelect('1')}
            >
              基座层
            </button>
            <p>棋子数据临时概览：{JSON.stringify(chessData)}</p>
          </div>
        </aside>
        
        {/* 左侧拖拽手柄 */}
        <div 
          className={`resize-handle resize-handle-left ${isDraggingLeft ? 'dragging' : ''}`}
          onMouseDown={handleMouseDownLeft}
        ></div>

        {/* 中间预览区域 */}
        <main className="preview-area">
          <ModelRenderer chess={currentChess} />
        </main>
        
        {/* 右侧拖拽手柄 */}
        <div 
          className={`resize-handle resize-handle-right ${isDraggingRight ? 'dragging' : ''}`}
          onMouseDown={handleMouseDownRight}
        ></div>

        {/* 右侧数据调节面板 */}
        <aside className="data-panel" style={{ width: `${rightWidth}px` }}>
          {renderDataEditor()}
        </aside>
      </div>
    </div>
  );
}

export default ChessEditor;

