# 模型导出器 API 文档

## 概述

模型导出器 (`modelExporter.js`) 是 Vigorous 模型编辑器的核心组件，支持将用户创建的 3D 模型导出为 STL 或 OBJ 格式，适用于 3D 打印和其他 3D 软件。

## 功能特性

### 支持的几何体类型

#### 1. 标准几何体
- **圆柱体 (cylinder)**: 64 段高精度圆柱
- **多边形 (polygon)**: 可指定边数的棱柱（默认 6 边）
- **立方体 (cube)**: 长方体/正方体

#### 2. 自定义几何体
- **旋转体 (special - lathe)**: 通过轮廓曲线绕 Y 轴旋转生成
  - 需要至少 3 个轮廓点
  - 适用于花瓶、棋子等轴对称物体
  
- **扫掠体 (special - sweep)**: 通过轮廓曲线沿路径曲线扫掠生成
  - 需要至少 3 个轮廓点和 3 个路径点
  - 适用于复杂曲面、扭曲造型等

### 支持的组件

模型由三个独立组件构成，每个组件可单独控制可见性和属性：

- **底座 (base)**: 模型的基础部分
- **柱体 (column)**: 模型的主体部分
- **装饰物 (decoration)**: 模型的装饰元素

### 材质属性

每个组件支持完整的 PBR 材质属性：

```javascript
{
  color: '#8B4513',           // 基础颜色
  metalness: 0.3,             // 金属度 (0-1)
  roughness: 0.4,             // 粗糙度 (0-1)
  clearcoat: 0,               // 清漆层 (0-1)
  clearcoatRoughness: 0       // 清漆层粗糙度 (0-1)
}
```

### 导出格式

- **STL**: 二进制格式，适合 3D 打印
  - 所有组件合并为单一网格
  - 使用统一材质
  - 文件体积小，兼容性高

- **OBJ**: 文本格式，保留材质信息
  - 各组件保持独立
  - 保留原始材质属性
  - 适合导入其他 3D 软件

## API 接口

### exportChessModel(chessData, format)

导出棋子模型为指定格式。

**参数:**
- `chessData` (Object): 棋子数据对象
  - `parts` (Object): 包含所有组件的数据
    - `base` (Object): 底座组件
    - `column` (Object): 柱体组件
    - `decoration` (Object): 装饰物组件
- `format` (String): 导出格式 ('stl' 或 'obj')，默认为 'stl'

**返回:**
- `Promise<Blob>`: 导出的文件 Blob 对象

**示例:**

```javascript
import { exportChessModel } from './utils/modelExporter';

// 导出为 STL
const chessData = {
  parts: {
    base: {
      Appear: 'True',
      shape: {
        type: 'cylinder',
        size1: 10,
        size2: 10,
        height: 5,
        position: { x: 0, y: 0, z: 0 }
      },
      material: {
        color: '#8B4513',
        metalness: 0.3,
        roughness: 0.4
      }
    },
    column: {
      Appear: 'True',
      shape: {
        type: 'cylinder',
        size1: 5,
        size2: 5,
        height: 20,
        position: { x: 0, y: 5, z: 0 }
      },
      material: {
        color: '#CD853F',
        metalness: 0.5,
        roughness: 0.3
      }
    },
    decoration: {
      Appear: 'True',
      modelId: 'sphere',
      position: { x: 0, y: 25, z: 0 }
    }
  }
};

try {
  const stlBlob = await exportChessModel(chessData, 'stl');
  // 下载或使用 stlBlob
} catch (error) {
  console.error('导出失败:', error);
}
```

### generateExportFilename(chessName, format)

生成带有时间戳的导出文件名。

**参数:**
- `chessName` (String): 棋子名称
- `format` (String): 文件格式 ('stl' 或 'obj')

**返回:**
- `String`: 安全的文件名

**示例:**

```javascript
const filename = generateExportFilename('我的棋子', 'stl');
// 输出：我的棋子_2025-03-05T12-30-45.stl
```

## 数据结构详解

### 标准几何体结构

```javascript
{
  Appear: 'True',              // 是否可见
  shape: {
    type: 'cylinder',          // 几何体类型
    size1: 10,                 // 尺寸参数 1
    size2: 10,                 // 尺寸参数 2
    height: 5,                 // 高度
    sides: 6,                  // 多边形边数（仅 polygon 类型需要）
    position: {                // 位置
      x: 0,
      y: 0,
      z: 0
    }
  },
  material: {                  // 材质
    color: '#8B4513',
    metalness: 0.3,
    roughness: 0.4,
    clearcoat: 0,
    clearcoatRoughness: 0
  }
}
```

### 异形几何体结构（旋转体）

```javascript
{
  Appear: 'True',
  shape: {
    type: 'special',           // 特殊类型
    position: { x: 0, y: 0, z: 0 }
  },
  customShape: {
    profilePoints: [           // 轮廓点（必需）
      { x: 140, y: 75 },
      { x: 150, y: 70 },
      { x: 160, y: 80 },
      // ... 至少 3 个点
    ],
    pathPoints: []             // 路径点（空数组表示旋转体）
  },
  material: { /* ... */ }
}
```

### 异形几何体结构（扫掠体）

```javascript
{
  Appear: 'True',
  shape: {
    type: 'special',
    position: { x: 0, y: 0, z: 0 }
  },
  customShape: {
    profilePoints: [           // 轮廓点（必需）
      { x: 140, y: 75 },
      { x: 150, y: 70 },
      { x: 160, y: 80 },
      // ... 至少 3 个点
    ],
    pathPoints: [              // 路径点（必需，用于扫掠）
      { x: 140, y: 75 },
      { x: 150, y: 80 },
      { x: 160, y: 70 },
      // ... 至少 3 个点
    ]
  },
  material: { /* ... */ }
}
```

## 错误处理

导出器会抛出以下类型的错误：

```javascript
try {
  const blob = await exportChessModel(invalidData, 'stl');
} catch (error) {
  // 可能的错误:
  // - "无效的棋子数据": chessData 为空或缺少 parts
  // - "没有可导出的几何体": 所有组件都不可见或几何体无效
  // - "不支持的导出格式：xxx": format 不是 'stl' 或 'obj'
  // - 其他几何体生成错误
}
```

## 最佳实践

### 1. 数据验证
在调用导出器前，确保数据结构完整：

```javascript
function validateChessData(data) {
  if (!data || !data.parts) {
    throw new Error('数据格式错误');
  }
  
  const components = ['base', 'column', 'decoration'];
  for (const comp of components) {
    const part = data.parts[comp];
    if (part && part.Appear === 'True') {
      if (!part.shape && comp !== 'decoration') {
        throw new Error(`${comp} 组件缺少形状数据`);
      }
    }
  }
  return true;
}
```

### 2. 性能优化
- 对于复杂的扫掠体，适当减少轮廓点和路径点数量
- STL 导出使用二进制格式以获得更小的文件体积
- 批量导出时添加延迟避免阻塞 UI

### 3. 文件下载
```javascript
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// 使用示例
const blob = await exportChessModel(chessData, 'stl');
downloadBlob(blob, generateExportFilename('棋子', 'stl'));
```

## 与 ModelRenderer 的一致性

导出器完全遵循 [`ModelRenderer`](file://d:\ProgrammingProjects\Vigorous\ReactRepo\src\Pages\chess_editor\modelrenderer\modelrenderer.jsx#L6-L261) 的渲染逻辑：

1. **坐标系统**: 使用相同的坐标转换规则
2. **几何体生成**: 旋转体和扫掠体的算法一致
3. **材质属性**: 支持相同的 PBR 参数
4. **组件可见性**: 尊重 `Appear` 字段

## 更新日志

### v2.0 (当前版本)
- ✅ 支持所有标准几何体（圆柱、多边形、立方体）
- ✅ 支持自定义旋转体
- ✅ 支持自定义扫掠体
- ✅ 完整的材质属性支持
- ✅ 装饰物组件导出
- ✅ STL 和 OBJ 双格式支持
- ✅ 优化的几何体合并算法

## 故障排除

### 问题：导出的模型变形
**解决**: 检查 `profilePoints` 和 `pathPoints` 的坐标是否正确，确保符合 Canvas 坐标系规范。

### 问题：导出文件为空
**解决**: 确认至少有一个组件的 `Appear` 为 `'True'` 且包含有效的形状数据。

### 问题：扫掠体无法生成
**解决**: 确保 `profilePoints.length >= 3` 且 `pathPoints.length >= 3`。

## 源代码位置

- 导出器实现：[`modelExporter.js`](file://d:\ProgrammingProjects\Vigorous\ReactRepo\src\utils\modelExporter.js)
- 渲染器参考：[`modelrenderer.jsx`](file://d:\ProgrammingProjects\Vigorous\ReactRepo\src\Pages\chess_editor\modelrenderer\modelrenderer.jsx)
- 异形生成器：[`CustomRevolutionGenerator.jsx`](file://d:\ProgrammingProjects\Vigorous\ReactRepo\src\Components\CustomRevolutionGenerator\CustomRevolutionGenerator.jsx)