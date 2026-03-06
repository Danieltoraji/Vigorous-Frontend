# 模型导出器 - 快速参考

## 🚀 快速开始

```javascript
import { exportChessModel, generateExportFilename } from './utils/modelExporter';

// 1. 准备数据
const chessData = { /* ... */ };

// 2. 导出为 STL
const blob = await exportChessModel(chessData, 'stl');

// 3. 生成文件名并下载
const filename = generateExportFilename('我的模型', 'stl');
downloadBlob(blob, filename);
```

## 📐 几何体类型速查

### 标准几何体

| 类型 | 参数 | 示例 |
|------|------|------|
| `cylinder` | size1, size2, height | 圆柱、圆管 |
| `polygon` | size1, size2, height, sides | 三棱柱、六棱柱 |
| `cube` | size1, size2, height | 长方体、正方体 |

### 自定义几何体

| 类型 | 必需参数 | 用途 |
|------|----------|------|
| **旋转体** | profilePoints (≥3) | 轴对称物体（花瓶、棋子） |
| **扫掠体** | profilePoints (≥3) + pathPoints (≥3) | 复杂曲面、扭曲造型 |

## 🎨 材质属性

```javascript
material: {
  color: '#8B4513',      // 颜色（十六进制）
  metalness: 0.3,        // 金属度 0-1
  roughness: 0.4,        // 粗糙度 0-1
  clearcoat: 0,          // 清漆层 0-1
  clearcoatRoughness: 0  // 清漆层粗糙度 0-1
}
```

## 🧩 组件结构

```javascript
parts: {
  base: {        // 底座
    Appear: 'True',
    shape: { /* ... */ },
    material: { /* ... */ }
  },
  column: {      // 柱体
    Appear: 'True',
    shape: { /* ... */ },
    material: { /* ... */ }
  },
  decoration: {  // 装饰物
    Appear: 'True',
    modelId: 'sphere',
    position: { x, y, z }
  }
}
```

## 📝 数据结构模板

### 圆柱体

```javascript
{
  Appear: 'True',
  shape: {
    type: 'cylinder',
    size1: 10,      // 顶部半径
    size2: 10,      // 底部半径
    height: 20,     // 高度
    position: { x: 0, y: 0, z: 0 }
  }
}
```

### 多边形棱柱

```javascript
{
  Appear: 'True',
  shape: {
    type: 'polygon',
    size1: 10,
    size2: 10,
    height: 20,
    sides: 6,       // 边数（3-任意）
    position: { x: 0, y: 0, z: 0 }
  }
}
```

### 立方体

```javascript
{
  Appear: 'True',
  shape: {
    type: 'cube',
    size1: 10,      // X 轴尺寸
    size2: 10,      // Z 轴尺寸
    height: 20,     // Y 轴高度
    position: { x: 0, y: 0, z: 0 }
  }
}
```

### 旋转体（异形）

```javascript
{
  Appear: 'True',
  shape: {
    type: 'special',
    position: { x: 0, y: 0, z: 0 }
  },
  customShape: {
    profilePoints: [  // 必需：至少 3 个点
      { x: 140, y: 75 },
      { x: 150, y: 70 },
      { x: 160, y: 80 }
    ],
    pathPoints: []    // 空数组 = 旋转体
  }
}
```

### 扫掠体（异形）

```javascript
{
  Appear: 'True',
  shape: {
    type: 'special',
    position: { x: 0, y: 0, z: 0 }
  },
  customShape: {
    profilePoints: [  // 轮廓曲线（必需）
      { x: 140, y: 75 },
      { x: 150, y: 70 },
      { x: 160, y: 80 }
    ],
    pathPoints: [     // 路径曲线（必需）
      { x: 140, y: 75 },
      { x: 150, y: 80 },
      { x: 160, y: 70 }
    ]
  }
}
```

## 🔧 坐标转换公式

### Canvas → 3D

```javascript
// 轮廓点转换
radius = (point.x - 140) / 8
height = -(point.y - 75) / 8

// 归一化因子（扫掠体）
factor = (point.x - 140) / 140

// 路径点转换
x = (point.x - 140) / 8
z = -(point.y - 75) / 8
```

**Canvas 中心点**: (140, 75)  
**注意**: Canvas Y 轴向下为正，3D Y 轴向上为正（需要取负）

## ⚠️ 常见错误

### ❌ 点数不足

```javascript
// 错误：只有 2 个点
profilePoints: [
  { x: 140, y: 75 },
  { x: 150, y: 70 }
]

// ✅ 正确：至少 3 个点
profilePoints: [
  { x: 140, y: 75 },
  { x: 150, y: 70 },
  { x: 160, y: 80 }
]
```

### ❌ 缺少必需字段

```javascript
// 错误：缺少 type
shape: {
  size1: 10,
  height: 20
}

// ✅ 正确
shape: {
  type: 'cylinder',
  size1: 10,
  height: 20
}
```

### ❌ 坐标系混淆

```javascript
// 错误：直接使用 Canvas 坐标
position: { x: 140, y: 75, z: 0 }

// ✅ 正确：使用 3D 坐标
position: { x: 0, y: 0, z: 0 }
```

## 💡 实用技巧

### 1. 下载文件

```javascript
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

### 2. 批量导出

```javascript
async function batchExport(models) {
  for (const model of models) {
    const blob = await exportChessModel(model.data, 'stl');
    downloadBlob(blob, generateExportFilename(model.name, 'stl'));
    await new Promise(r => setTimeout(r, 100)); // 避免阻塞
  }
}
```

### 3. 验证数据

```javascript
function validateModel(data) {
  if (!data?.parts) return false;
  
  for (const [key, part] of Object.entries(data.parts)) {
    if (part.Appear === 'False') continue;
    
    if (key !== 'decoration' && !part.shape) {
      return false;
    }
    
    if (part.shape?.type === 'special') {
      const cs = part.customShape;
      if (!cs?.profilePoints || cs.profilePoints.length < 3) {
        return false;
      }
      if (cs.pathPoints && cs.pathPoints.length < 3) {
        return false;
      }
    }
  }
  return true;
}
```

## 📊 导出格式对比

| 特性 | STL | OBJ |
|------|-----|-----|
| 文件格式 | 二进制 | 文本 |
| 文件大小 | 小 | 大 |
| 材质支持 | ❌ | ✅ |
| 多组件 | 合并 | 独立 |
| 3D 打印 | ✅ 推荐 | ✅ |
| 其他软件 | ⚠️ 有限 | ✅ 完整 |

## 🎯 选择建议

**使用 STL 当:**
- ✅ 用于 3D 打印
- ✅ 需要小文件
- ✅ 不需要材质信息

**使用 OBJ 当:**
- ✅ 导入其他 3D 软件
- ✅ 需要保留材质
- ✅ 需要独立组件

## 🔗 相关资源

- [完整 API 文档](./MODEL_EXPORTER_GUIDE.md)
- [重构总结](./EXPORTER_REFACTOR_SUMMARY.md)
- [ModelRenderer](../Pages/chess_editor/modelrenderer/modelrenderer.jsx)
- [异形生成器](../Components/CustomRevolutionGenerator/CustomRevolutionGenerator.jsx)

---

**版本**: v2.0  
**最后更新**: 2026-03-05