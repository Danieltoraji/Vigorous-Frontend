import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './template_editor.css';
import { useTemplates } from '../../hooks/useTemplates.jsx';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import ModelRenderer from './templaterenderer/templaterenderer.jsx';
import CustomRevolutionGenerator from '../../Components/CustomRevolutionGenerator/CustomRevolutionGenerator.jsx';
import csrfapi from '../../utils/csrfapi.js';

import { exportScene, downloadBlob, generateExportFilename } from '../../utils/exportScene.js';
function TemplateEditor() {
  const { templatesData, updateTemplate, setTemplatesData, fetchTemplate } = useTemplates();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: pieceId } = useParams();
  const [currentTemplate, setCurrentTemplate] = useState(null);


  // Reference to the model root group for export
  const modelRootRef = useRef(null);



  const [selectedComponent, setSelectedComponent] = useState('base'); // 默认选中底座组件
  const [lastSaved, setLastSaved] = useState(new Date().toLocaleString());

  // 右侧面板固定宽度
  const [rightWidth, setRightWidth] = useState(400); // 右侧面板宽度
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false); // 右侧面板收起状态
  const [showExportModal, setShowExportModal] = useState(false); // 导出窗口显示状态

  // AI 生成相关状态
  const [showAIGenerator, setShowAIGenerator] = useState(false); // AI 生成器显示状态
  const [aiPrompt, setAiPrompt] = useState(''); // AI 提示词
  const [isGenerating, setIsGenerating] = useState(false); // AI 生成中状态
  const [aiError, setAiError] = useState(''); // AI 生成错误信息

  // 引用
  const editorContentRef = useRef(null);

  // HDR 预设相关状态
  const [selectedHdrPreset, setSelectedHdrPreset] = useState('syria'); // 默认选中 stage.hdr
  const [showHdrSelector, setShowHdrSelector] = useState(false); // HDR 选择器显示状态

  // HDR 预设列表
  const hdrPresets = [
    { id: 'syria', name: '叙利亚', file: '/static/chessbg/syria.hdr' },
    { id: 'sky', name: '皆若空游无所依', file: '/static/chessbg/sky.hdr' },
    { id: 'ruralroad', name: '乡间小路', file: '/static/chessbg/ruralroad.hdr' },
    { id: 'glasshouse', name: '玻璃房', file: '/static/chessbg/glasshouse.hdr' },
    { id: 'cinema', name: '电影院', file: '/static/chessbg/cinema.hdr' },
  ];

  // 当templateData或location.state变化时更新currentTemplate

  const fetchData = async () => {
    try {
      console.log('正在获取模板：', pieceId);
      const fetchedData = await fetchTemplate(pieceId);
      if (fetchedData) {
        console.log('获取成功：', fetchedData);
        setCurrentTemplate(fetchedData);
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
    if (!currentTemplate) return;

    // 深度克隆当前数据
    const updatedTemplate = JSON.parse(JSON.stringify(currentTemplate));
    console.log('正在更新棋子数据：', path, value);
    // 根据路径更新数据
    const keys = path.split('.');
    let target = updatedTemplate;

    for (let i = 0; i < keys.length - 1; i++) {
      // 确保中间对象存在
      if (!target[keys[i]]) {
        target[keys[i]] = {};
      }
      target = target[keys[i]];
    }

    target[keys[keys.length - 1]] = value;

    // 更新本地状态
    setCurrentTemplate(updatedTemplate);

    // 更新全局状态
    setTemplatesData(prev => ({
      ...prev,
      [currentTemplate.id]: updatedTemplate
    }));
  }, [currentTemplate, setTemplatesData]);

  // 处理保存 - 使用 useCallback
  const handleSave = useCallback(async () => {
    if (!currentTemplate) return;

    try {
      // 调用 updateTemplate 方法向后端保存数据
      await updateTemplate(currentTemplate.id, currentTemplate);

      // 更新保存时间
      setLastSaved(new Date().toLocaleString());
    } catch (error) {
      alert('保存失败：' + (error.message || '未知错误'));
    }
  }, [currentTemplate, updateTemplate]);

  // AI 生成模型 - 根据提示词生成 JSON 格式的模型数据
  const handleAIGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) {
      setAiError('请输入描述词');
      return;
    }

    setIsGenerating(true);
    setAiError('');

    try {
      // 系统提示词：指导 AI 只输出 JSON 格式
      const systemPrompt = `你是一个专业的 3D 棋子建模参数生成助手，服务于一个基于 Three.js 的棋子编辑器。你的任务是根据用户的自然语言描述，生成符合指定 JSON Schema 的模型参数数据，用于实时渲染棋子模型。

========================
【项目建模逻辑】
========================
该编辑器中的棋子由三个主要部分组成：

1. base（底座）
2. column（主体轮廓，通过旋转曲线生成）
3. decoration（顶部装饰）

最终模型是通过这些参数在 Three.js 中构建的几何体组合。

------------------------
【1. base（底座）】
------------------------
- 通常位于最底部（y ≈ 0）
- 可以与2一样生成特殊曲线，但是一般只使用如下的简单几何体
参数结构及说明：
{
  shape: {
    type: 'cycle' | 'polygon' | 'special' | 'cube', （底面形状）
    size1: number,(顶面大小)
    size2: number,(底面大小)
    height: number,(高度)
    sides: int,(多边形边数， polygon 专用,范围为3-64)
  },

  pattern: {
    shape: 'none' | 'text' | 'geometry' | 'strange', (浮雕效果的形状)
    content: string,(浮雕text专用，表示文字内容)

    geometryType: 'Cube' | 'Circle' | 'Polygon' | 'strange',（选geometry时的形状）
    sides: number,（polygon 专用，范围为3-64)）

    size: number,（浮雕缩放大小）
    depth: number,（浮雕高度）

    position: {
      x: number,
      y: number,
      z: number
    }
  },

  edge: {
    type: 'none' | 'smooth' | 'round',（边缘处理效果）
    depth: number,（强度）
    segments: number（采样数）
  },

  material: {
    metalness: number,
    roughness: number,
    clearcoat: number,
    clearcoatRoughness: number
  }
}
设计原则：
- 底座要稳重，尺寸通常比 column 更宽
- 高度较低（3~8）

------------------------
【2. column（主体）】
------------------------

## 生成方式选择
主体可以通过以下两种方式生成：

### 方式 1：预设几何体（推荐简单场景）
- **cycle**：圆柱体（最常用）
- **polygon**：多边形棱柱（3-32 边）
- **cube**：长方体
- **special**：异形旋转体（通过曲线编辑器生成）

### 方式 2：旋转曲线生成（推荐复杂场景）⭐
使用 \`customShape.profilePoints\` 定义轮廓曲线，绕 Y 轴旋转 360°生成 3D 模型。

---

## 核心概念：旋转体生成原理

### 坐标系统
- **画布尺寸**：宽 1200px × 高 675px
- **中心线**：X = 600px（Y 轴，旋转轴）
- **绘制区域**：仅在左侧（X < 600）
- **镜像显示**：系统自动在右侧生成对称镜像（仅用于可视化）
- **实际生成**：使用左侧轮廓点绕中心线旋转 360°

### 数据结构详解

#### 控制点格式（Editor Format）
这是在编辑器中使用的格式，包含控制信息：

      {
        id: number,              // 唯一标识符（从 1 开始递增）
          type: 'point' | 'bezier' | 'free',  // 点类型
            pos: [x, y],            // 坐标位置 [x, y]
              handlepos ?: [cp1x, cp1y, cp2x, cp2y], // 贝塞尔手柄（仅 bezier 类型）
              previd ?: number         // 前一个点的 ID
      }

方法2的column字段完整示例：
"column": {"shape": {"type": "cycle", "size1": 5, "size2": 9, "height": 18.5, "sides": 6}, "customShape": {"profilePoints": [{"id": 64, "type": "bezier", "pos": [552.7137354131368, 181.94656511464711], "handlepos": [512.7137354131368, 181.94656511464711, 572.7137354131368, 181.94656511464711], "previd": null}, {"id": 65, "type": "bezier", "pos": [375.65690523703546, 251.27647474873925], "handlepos": [375.65690523703546, 184.0797931033884, 473.7847870213808, 366.47078614076923], "previd": 64}, {"id": 66, "type": "bezier", "pos": [368.19065336213964, 337.67220829276175], "handlepos": [328.72617916626166, 311.00685843349555, 414.05477202221414, 388.86968002255287], "previd": 65}, {"id": 67, "type": "bezier", "pos": [446.05299434319625, 430.46762580300816], "handlepos": [406.05299434319625, 430.46762580300816, 466.0529943431965, 430.46762580300816], "previd": 66}, {"id": 68, "type": "point", "pos": [443.9197795217974, 517.9299733414014], "previd": 67}, {"id": 69, "type": "point", "pos": [554.8469502345356, 545.6619371950381], "previd": 68}, {"id": 70, "type": "point", "pos": [595.378031841113, 562.7277611049685], "previd": 69}], "pathPoints": []}, "material": null, "position": {"x": 0, "y": 0, "z": 0}, "sideTreatment": "none", "pattern": {"shape": "geometry", "geometryType": "Cube", "position": {"x": 0, "y": 0, "z": 0}, "size": 5, "depth": 0.5}, "edge": {"type": "smooth", "depth": 0.2}},
------------------------
【3. decoration（装饰）】
------------------------
- 位于顶部
- position.y 应略高于 body 最高点
- 参数结构及说明：
{
  modelId: string, // 预设模型ID

  size: {
    size1: number,
    size2: number,
    size3: number
  },

  position: {
    x: number,
    y: number,
    z: number
  },

  rotation: {
    x: number,
    y: number,
    z: number
  },

  material: {
    metalness: number,
    roughness: number,
    clearcoat: number,
    clearcoatRoughness: number
  }
}
modelId 含义：
- "0"：无
- "1"：旗子
- "2"：五角星
- "3"：球体（最常用）
- "4"：棱锥

设计原则：
- decoration 必须与 body 顶部对齐
- size 一般较小（5~10）

========================
【材质规则】
========================
每个部分都有 material：

- color：必须是 HEX 格式（如 #8B4513）
- metalness：
  - 木质：0.1 ~ 0.3
  - 金属：0.6 ~ 1
- roughness：
  - 光滑：0.2 ~ 0.4
  - 粗糙：0.5 ~ 0.8

推荐风格：
- 木质棋子：棕色系
- 金属棋子：金色 / 银色

========================
【整体设计约束】
========================
1. 所有数值必须在 Schema 限制范围内
2. 所有字段必须存在（不能缺省关键字段）
3. 保持结构完整：
   - parts.base
   - parts.body
   - parts.decoration
4. 各部分比例要合理（不能穿模）
5. body 高度 + decoration = 总高度
6. decoration 位置必须在顶部

========================
【默认策略（重要）】
========================
如果用户描述模糊：
- 默认生成“国际象棋风格”
- 使用：
  - 圆柱底座
  - 平滑曲线主体
  - 顶部球体装饰

========================
【输出要求（必须严格遵守）】
========================
1. 只输出 JSON
2. 不要输出任何解释或 markdown
3. 不要出现 \`\`\` 或说明文字
4. JSON 必须可以直接 JSON.parse
5. 所有字段必须符合 Schema
6. 最后的json类似这样：
{"parts":
{
"base": {...},
"column": {...},
"decoration": {...}
}}
========================
【示例（仅供理解，不要复制）】
========================
一个标准棋子：
- 宽底座
- 收腰主体
- 顶部球体


========================
【你的目标】
========================
根据用户描述，生成一个：
✔ 结构正确
✔ 比例合理
✔ 可直接渲染
✔ 风格符合描述

的 JSON 模型数据`;

      // 使用 csrfapi 发送请求到后端代理，后端会转发到 SiliconFlow API
      const response = await csrfapi.post('/llm/', {
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: aiPrompt
          }
        ]
      });

      // axios 响应格式与 fetch 不同，数据在 response.data 中
      const data = response.data;
      console.log('AI 响应数据:', data);

      // 后端返回格式为：{ reply: "JSON 字符串" }
      let jsonString = data.reply;

      if (!jsonString) {
        throw new Error('AI 返回的数据格式不正确，请检查后端 API 配置');
      }

      // 尝试解析 JSON
      let generatedData;
      try {
        generatedData = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      } catch (parseError) {
        console.error('JSON 解析失败:', parseError);
        console.error('原始返回:', jsonString);
        throw new Error('AI 返回的数据不是有效的 JSON 格式，可能 AI 没有理解指令，请重试？');
      }

      // 验证生成的数据结构
      if (!generatedData.parts) {
        throw new Error('AI 返回的数据缺少 parts 字段，请重试？');
      }

      // 合并到当前棋子数据
      const updatedTemplate = {
        ...currentTemplate,
        parts: {
          ...currentTemplate.parts,
          ...generatedData.parts
        }
      };

      // 更新本地状态
      setCurrentTemplate(updatedTemplate);

      // 更新全局状态
      setTemplatesData(prev => ({
        ...prev,
        [currentTemplate.id]: updatedTemplate
      }));

      // 清空提示词并关闭生成器
      setAiPrompt('');
      setShowAIGenerator(false);

      alert('AI 生成成功！模型已更新。');

    } catch (error) {
      console.error('AI 生成失败:', error);
      setAiError(error.message || 'AI 生成失败，请重试');
      alert('AI 生成失败：' + (error.message || '未知错误'));
    } finally {
      setIsGenerating(false);
    }
  }, [aiPrompt, currentTemplate, setTemplatesData]);

  // 处理右侧面板收起/展开
  const handleToggleRightPanel = useCallback(() => {
    setIsRightPanelCollapsed(prev => !prev);
  }, []);


  // 处理导出：点击导出按键，弹出导出窗口
  const handleExport = () => {
    if (!currentTemplate) {
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
      console.log('正在做导出准备,json', currentTemplate, 'stl/obj', modelRootRef.current);
      blob = await exportScene(currentTemplate, modelRootRef.current, format);
      filename = generateExportFilename(currentTemplate.name, format);
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
    const projectId = currentTemplate.project;
    navigate(`/explorer-templates/`);
  };

  // Handle model ready callback - receives the Three.js Group containing the template model
  const handleModelReady = useCallback((modelRoot) => {
    modelRootRef.current = modelRoot;
    console.log('Model ready for export:', modelRoot);
  }, []);


  const handleMouseMove = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!editorContentRef.current) return;

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
    if (!currentTemplate || !currentTemplate.parts?.base) return null;

    const component = currentTemplate.parts.base;
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
                currentTemplate={currentTemplate}
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

              {edge.type === 'smooth' && (
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
              )}
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
              value={getSafeValue(currentTemplate.parts?.base?.material?.metalness, 0.3)}
              onChange={(e) => handleDataUpdate('parts.base.material.metalness', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentTemplate.parts?.base?.material?.metalness, 0.3)}
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
              value={getSafeValue(currentTemplate.parts?.base?.material?.roughness, 0.4)}
              onChange={(e) => handleDataUpdate('parts.base.material.roughness', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentTemplate.parts?.base?.material?.roughness, 0.4)}
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
              value={getSafeValue(currentTemplate.parts?.base?.material?.clearcoat, 0)}
              onChange={(e) => handleDataUpdate('parts.base.material.clearcoat', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentTemplate.parts?.base?.material?.clearcoat, 0)}
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
              value={getSafeValue(currentTemplate.parts?.base?.material?.clearcoatRoughness, 0)}
              onChange={(e) => handleDataUpdate('parts.base.material.clearcoatRoughness', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentTemplate.parts?.base?.material?.clearcoatRoughness, 0)}
              onChange={(e) => handleDataUpdate('parts.base.material.clearcoatRoughness', parseFloat(e.target.value))}
              className="number-input"
            />
          </div>
        </div>
      </div>
    );
  }, [currentTemplate, handleDataUpdate, selectedComponent]);

  // 渲染柱体组件参数面板 - 使用普通函数以确保状态能正确更新
  const renderColumnPanel = () => {
    if (!currentTemplate || !currentTemplate.parts?.column) return null;

    const component = currentTemplate.parts.column;
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
                currentTemplate={currentTemplate}
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

              {edge.type === 'smooth' && (
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
              )}
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
              value={getSafeValue(currentTemplate.parts?.column?.material?.metalness, 0.3)}
              onChange={(e) => handleDataUpdate('parts.column.material.metalness', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentTemplate.parts?.column?.material?.metalness, 0.3)}
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
              value={getSafeValue(currentTemplate.parts?.column?.material?.roughness, 0.4)}
              onChange={(e) => handleDataUpdate('parts.column.material.roughness', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentTemplate.parts?.column?.material?.roughness, 0.4)}
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
              value={getSafeValue(currentTemplate.parts?.column?.material?.clearcoat, 0)}
              onChange={(e) => handleDataUpdate('parts.column.material.clearcoat', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentTemplate.parts?.column?.material?.clearcoat, 0)}
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
              value={getSafeValue(currentTemplate.parts?.column?.material?.clearcoatRoughness, 0)}
              onChange={(e) => handleDataUpdate('parts.column.material.clearcoatRoughness', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentTemplate.parts?.column?.material?.clearcoatRoughness, 0)}
              onChange={(e) => handleDataUpdate('parts.column.material.clearcoatRoughness', parseFloat(e.target.value))}
              className="number-input"
            />
          </div>
        </div>
      </div>
    );
  };

  // 渲染装饰组件参数面板 - 使用普通函数以确保状态能正确更新
  const renderDecorationPanel = () => {
    if (!currentTemplate || !currentTemplate.parts?.decoration) return null;

    const component = currentTemplate.parts.decoration;
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
          <div className="editor-item">
            <button
              className="btn btn-primary"
              onClick={() => setShowAIGenerator(!showAIGenerator)}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {showAIGenerator ? '收起 AI 生成器' : '✨ AI 智能生成'}
            </button>
          </div>

          {/* AI 生成器面板 */}
          {showAIGenerator && (
            <div className="ai-generator-panel" style={{
              marginTop: '16px',
              padding: '16px',
              background: 'linear-gradient(135deg, #667eea1a, #764ba21a)',
              borderRadius: '8px',
              border: '1px solid rgba(102, 126, 234, 0.3)'
            }}>
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#667eea', fontSize: '14px' }}>
                  🤖 AI 模型生成
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
                  描述你想要的棋子样式，AI 会自动生成 3D 模型参数。例如："一个古典风格的国际象棋皇后，棕色木质纹理，顶部有金色圆球装饰"
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="请输入描述词..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid rgba(102, 126, 234, 0.3)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {aiError && (
                <div style={{
                  marginBottom: '12px',
                  padding: '8px',
                  background: '#fee',
                  border: '1px solid #fcc',
                  borderRadius: '4px',
                  color: '#c00',
                  fontSize: '12px'
                }}>
                  ⚠️ {aiError}
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handleAIGenerate}
                disabled={isGenerating || !aiPrompt.trim()}
                style={{
                  width: '100%',
                  background: isGenerating ? '#ccc' : 'linear-gradient(135deg, #667eea, #764ba2)',
                  cursor: isGenerating ? 'not-allowed' : 'pointer'
                }}
              >
                {isGenerating ? '🔄 生成中...' : '🎨 开始生成'}
              </button>
            </div>
          )}
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
              value={getSafeValue(currentTemplate.parts?.decoration?.material?.metalness, 0.5)}
              onChange={(e) => handleDataUpdate('parts.decoration.material.metalness', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentTemplate.parts?.decoration?.material?.metalness, 0.5)}
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
              value={getSafeValue(currentTemplate.parts?.decoration?.material?.roughness, 0.3)}
              onChange={(e) => handleDataUpdate('parts.decoration.material.roughness', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentTemplate.parts?.decoration?.material?.roughness, 0.3)}
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
              value={getSafeValue(currentTemplate.parts?.decoration?.material?.clearcoat, 0)}
              onChange={(e) => handleDataUpdate('parts.decoration.material.clearcoat', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentTemplate.parts?.decoration?.material?.clearcoat, 0)}
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
              value={getSafeValue(currentTemplate.parts?.decoration?.material?.clearcoatRoughness, 0)}
              onChange={(e) => handleDataUpdate('parts.decoration.material.clearcoatRoughness', parseFloat(e.target.value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={getSafeValue(currentTemplate.parts?.decoration?.material?.clearcoatRoughness, 0)}
              onChange={(e) => handleDataUpdate('parts.decoration.material.clearcoatRoughness', parseFloat(e.target.value))}
              className="number-input"
            />
          </div>
        </div>
      </div>
    );
  };

  // 如果 currentTemplate 还没有准备好，显示加载状态
  if (!currentTemplate) {
    return (
      <div className="template-editor" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>加载中...</h2>
          <p>正在准备棋子数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="template-editor">
      {/* 顶部标题栏 */}
      <header className="editor-header">
        <div className="header-left">
          <button className="back-button" onClick={handleBack}>← 返回</button>
          <h1 className="template-name">{currentTemplate?.name || '棋子编辑器'}</h1>
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
          <ModelRenderer
            template={currentTemplate}
            onModelReady={handleModelReady}
            hdrFile={hdrPresets.find(p => p.id === selectedHdrPreset)?.file || '/stage.hdr'}
          />

          {/* HDR 预设选择器 */}
          <div className="hdr-selector-container">
            <button
              className="hdr-selector-toggle"
              onClick={() => setShowHdrSelector(!showHdrSelector)}
              title="选择环境贴图"
            >
              🌍 环境光
            </button>

            {showHdrSelector && (
              <div className="hdr-presets-dropdown">
                <h4>环境贴图预设</h4>
                <div className="hdr-presets-list">
                  {hdrPresets.map(preset => (
                    <button
                      key={preset.id}
                      className={`hdr-preset-item ${selectedHdrPreset === preset.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedHdrPreset(preset.id);
                        setShowHdrSelector(false);
                      }}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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

export default TemplateEditor;