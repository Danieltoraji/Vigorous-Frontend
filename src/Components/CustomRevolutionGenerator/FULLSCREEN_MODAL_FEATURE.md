# CustomRevolutionGenerator - 全屏绘制功能

## 🎯 功能概述

CustomRevolutionGenerator 组件现在支持**全屏绘制模式**，允许用户在模态窗口中进行更精细的曲线编辑，同时保持原有的侧边栏预览功能。

## ✨ 新增特性

### 1. 全屏模态窗口
- **触发方式**：点击画布标题栏右侧的 "⛶ 全屏" 按钮
- **窗口特性**：
  - 遮罩层背景，点击关闭
  - 支持 ESC 键快速退出
  - 禁用背景滚动（overflow: hidden）
  - 毛玻璃效果（Fluent Design 风格）
  - 淡入/滑入动画

### 2. 画布比例保护
- **原始比例**：严格保持 280x150 的长宽比（约 16:9）
- **自适应策略**：
  - 使用 `aspect-ratio: 280/150` CSS 属性强制维持比例
  - 结合 `object-fit: contain` 实现等比缩放
  - 居中布局，自动适应各种屏幕尺寸

### 3. 功能完整性
全屏模式下保留所有原始功能：
- ✅ 三种绘制模式（点绘、贝塞尔、自由绘制）
- ✅ 锚点和手柄编辑
- ✅ 实时曲线预览
- ✅ 方程生成
- ✅ 清空操作
- ✅ 数据同步（与父组件共享状态）

### 4. 只读模式支持
- 新增 `readOnly` 属性，控制画布的交互权限
- 新增 `showFullScreen` 属性，控制是否显示全屏按钮
- 只读模式下：
  - 禁用直接编辑操作
  - 保留全屏入口按钮（始终可用）
  - 按钮文本和样式置灰提示

## 📋 Props 接口

```jsx
<SimpleCanvas
  title="轮廓曲线"                    // 画布标题
  onPointsChange={handleProfileChange} // 数据变化回调
  equationPlaceholder="例如：2*Math.sin(x)+1" // 方程输入框提示
  className="profile-canvas"          // 自定义 CSS 类名
  initialPoints={profilePoints}       // 初始点数据
  enableBezier={true}                 // 是否启用贝塞尔模式
  readOnly={false}                    // 只读模式（新增）
  showFullScreen={true}               // 显示全屏按钮（新增）
/>
```

## 🎨 视觉反馈

### 光标状态
- **默认箭头**：空白区域
- **移动光标** (move)：悬停/拖动锚点
- **十字光标** (crosshair)：悬停/拖动手柄或自由绘制

### 模式提示
- **点绘模式**：✏️ 点绘 - 红色圆点 + 青色折线
- **贝塞尔模式**：🎨 贝塞尔 - 红色锚点 + 黄色高亮 + 青色曲线 + 红色手柄
- **自由绘制**：🖌️ 自由绘制 - 青色平滑曲线 + 起点/终点标记

## 🔧 技术实现

### 关键代码
```jsx
// 1. 使用 React Portal 渲染到 document.body
import { createPortal } from 'react-dom';

// 2. 模态窗口状态管理
const [isModalOpen, setIsModalOpen] = useState(false);

// 3. 保持画布比例
<div style={{
  aspectRatio: '280/150',
  maxWidth: '100%',
  maxHeight: '100%'
}}>
  <canvas width={280} height={150} />
</div>

// 4. ESC 键退出
useEffect(() => {
  const handleEsc = (e) => {
    if (e.key === 'Escape' && isModalOpen) {
      closeModal();
    }
  };
  document.addEventListener('keydown', handleEsc);
  return () => document.removeEventListener('keydown', handleEsc);
}, [isModalOpen, closeModal]);
```

### 数据同步机制
- 模态窗口与原始画布**共享同一套 ref 和状态**
- 任何修改都会通过 `onPointsChange` 回调实时同步到父组件
- 关闭模态窗口后，侧边栏画布立即显示最新数据

## 🎯 使用场景

### 场景 1：精细曲线设计
1. 在侧边栏小画布中初步绘制轮廓
2. 点击"全屏"进入专注编辑模式
3. 调整贝塞尔手柄，优化曲线细节
4. 点击"完成"返回侧边栏视图

### 场景 2：多画布对比编辑
1. 轮廓曲线和路径曲线分别在小窗口预览
2. 逐个打开全屏模式进行精细调整
3. 实时查看 3D 模型更新效果

### 场景 3：只读预览
1. 设置 `readOnly={true}` 禁用编辑
2. 保留全屏按钮供用户查看细节
3. 点击全屏后仍可查看但不能修改

## 📝 注意事项

1. **长宽比保护**：全屏画布严格保持 280/150 比例，不会因窗口大小而变形
2. **响应式适配**：自动适应从大屏到移动端的各种分辨率
3. **性能优化**：仅在必要时重绘曲线，使用 useCallback 避免不必要的重渲染
4. **无障碍访问**：支持键盘导航（ESC 退出、Tab 切换）
5. **触摸友好**：在移动设备上同样支持触摸操作

## 🔄 兼容性

- ✅ 完全向后兼容现有代码
- ✅ 不影响原有侧边栏布局和功能
- ✅ 支持所有现有的绘制模式和交互逻辑
- ✅ 与 ModelPreview 组件无缝集成

## 🎨 CSS 样式

全屏模态窗口使用 Fluent Design 设计系统的 CSS 变量：
- `--fluent-acrylic`: 亚克力材质背景
- `--fluent-border`: 边框颜色
- `--fluent-shadow-hover`: 悬停阴影
- `--fluent-radius`: 圆角半径
- `--fluent-transition`: 过渡动画

## 📦 导出

```jsx
export default CustomRevolutionGenerator;
// SimpleCanvas 作为内部组件使用
```
