# Utils 工具模块

本目录包含 Vigorous 项目的核心工具函数和辅助模块。

## 📦 模块列表

### 1. modelExporter.js - 模型导出器 ⭐

**版本**: v2.0  
**功能**: 将 3D 模型导出为 STL 或 OBJ 格式

**支持的几何体类型**:
- ✅ 标准几何体：圆柱、多边形、立方体
- ✅ 自定义旋转体：通过轮廓曲线生成
- ✅ 自定义扫掠体：通过轮廓 + 路径曲线生成

**主要 API**:
```javascript
import { exportChessModel, generateExportFilename } from './modelExporter';

// 导出模型
const blob = await exportChessModel(chessData, 'stl');

// 生成文件名
const filename = generateExportFilename('模型名', 'stl');
```

**文档**:
- [完整使用指南](./MODEL_EXPORTER_GUIDE.md)
- [快速参考](./EXPORTER_QUICK_REFERENCE.md)
- [重构总结](./EXPORTER_REFACTOR_SUMMARY.md)

### 2. csrfapi.js - CSRF 保护 API

**功能**: 处理 Django CSRF token，确保跨站请求安全

**使用方式**:
```javascript
import { getCsrfToken } from './csrfapi';

const csrfToken = getCsrfToken();
// 在请求头中使用：X-CSRFToken: csrfToken
```

## 📚 文档索引

### modelExporter.js 相关文档

1. **[MODEL_EXPORTER_GUIDE.md](./MODEL_EXPORTER_GUIDE.md)** - 8.2KB
   - 完整的 API 文档
   - 所有几何体类型的详细说明
   - 数据结构模板
   - 错误处理指南
   - 最佳实践

2. **[EXPORTER_QUICK_REFERENCE.md](./EXPORTER_QUICK_REFERENCE.md)** - 5.9KB
   - 快速开始示例
   - 常用数据结构模板
   - 坐标转换公式
   - 常见错误及解决方案
   - 实用技巧和代码片段

3. **[EXPORTER_REFACTOR_SUMMARY.md](./EXPORTER_REFACTOR_SUMMARY.md)** - 6.8KB
   - v2.0 重构详细说明
   - 新旧版本对比
   - 技术改进点
   - 验证清单

## 🎯 使用建议

### 选择合适的文档

- **第一次使用** → 阅读 [MODEL_EXPORTER_GUIDE.md](./MODEL_EXPORTER_GUIDE.md)
- **日常开发** → 查看 [EXPORTER_QUICK_REFERENCE.md](./EXPORTER_QUICK_REFERENCE.md)
- **了解背景** → 参考 [EXPORTER_REFACTOR_SUMMARY.md](./EXPORTER_REFACTOR_SUMMARY.md)

### 导入示例

```javascript
// ES6 模块导入
import { exportChessModel, generateExportFilename } from './utils/modelExporter';

// 或者按需导入特定函数
import { exportChessModel } from './utils/modelExporter';
```

## 🔧 开发注意事项

### 1. Three.js 依赖

`modelExporter.js` 依赖以下 Three.js 模块：

```javascript
import { 
  MeshStandardMaterial, 
  CylinderGeometry, 
  BoxGeometry, 
  Mesh, 
  Matrix4, 
  BufferGeometry,
  Float32BufferAttribute,
  Vector3,
  LatheGeometry,
  Group
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
```

确保项目中已安装 Three.js：

```bash
npm install three
```

### 2. 浏览器兼容性

需要支持 ES6+ 的现代浏览器：
- Chrome >= 60
- Firefox >= 60
- Safari >= 12
- Edge >= 79

### 3. 性能考虑

- STL 二进制格式比文本格式快 10 倍
- 复杂扫掠体（>100 点）可能影响性能
- 建议对轮廓点和路径点进行适当简化

## 🐛 故障排除

### 问题：导入错误 "Module not found"

**解决**: 检查 Three.js 是否已安装，确认导入路径正确。

### 问题：导出的模型为空

**解决**: 
1. 检查 `chessData.parts` 是否存在
2. 确认至少一个组件的 `Appear` 为 `'True'`
3. 验证形状数据完整性

### 问题：异形模型无法导出

**解决**:
1. 确认 `profilePoints.length >= 3`
2. 如果是扫掠体，确认 `pathPoints.length >= 3`
3. 检查 Canvas 坐标是否正确（中心点 140, 75）

## 📖 相关资源

### 内部资源
- [ModelRenderer 组件](../Pages/chess_editor/modelrenderer/modelrenderer.jsx) - 3D 渲染逻辑
- [异形生成器](../Components/CustomRevolutionGenerator/CustomRevolutionGenerator.jsx) - 自定义形状编辑

### 外部资源
- [Three.js 官方文档](https://threejs.org/docs/)
- [STL 格式规范](https://en.wikipedia.org/wiki/STL_(file_format))
- [OBJ 格式规范](https://en.wikipedia.org/wiki/Wavefront_.obj_file)

## 📝 更新日志

### v2.0 (2026-03-05)
- ✅ 完全重写导出器，支持所有几何体类型
- ✅ 新增旋转体和扫掠体支持
- ✅ 新增装饰物组件导出
- ✅ 新增完整材质属性支持
- ✅ 优化 STL 和 OBJ 导出逻辑
- ✅ 完善错误处理和文档

### v1.0 (早期版本)
- 基础 STL/OBJ 导出功能
- 仅支持简单几何体（圆柱、矩形等）
- 有限的材质支持

---

**维护者**: Vigorous Team  
**最后更新**: 2026-03-05