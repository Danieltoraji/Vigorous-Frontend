import { MeshStandardMaterial, CylinderGeometry, BoxGeometry, Mesh, Matrix4, BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';

/**
 * 导出棋子模型为指定格式
 * @param {Object} chessData - 棋子数据对象
 * @param {string} format - 导出格式 ('stl' 或 'obj')
 * @returns {Blob} - 导出的文件 Blob
 */
export async function exportChessModel(chessData, format = 'stl') {
  try {
    const geometries = [];
    
    // 收集所有可见部件的几何体
    for (let i = 1; i <= 4; i++) {
      const partKey = i.toString();
      const partData = chessData.parts[partKey];
      
      if (!partData || partData.Appear !== 'True' || !partData.Shape) {
        continue;
      }

      const shape = partData.Shape;
      let geometry = null;

      // 根据形状类型创建几何体 - 与 ModelRenderer 保持一致
      switch (shape.type) {
        case 'Circle':
          // 圆形：64 段圆柱
          geometry = new CylinderGeometry(shape.size1, shape.size1, shape.height, 64);
          break;
        case 'Rectangle':
          // 矩形：长方体
          geometry = new BoxGeometry(shape.size1, shape.height, shape.size2);
          break;
        case 'Triangle':
          // 三角形：3 段圆柱（三棱柱）
          geometry = new CylinderGeometry(shape.size1, shape.size1, shape.height, 3);
          break;
        case 'Square':
          // 正方形：正方体
          geometry = new BoxGeometry(shape.size1, shape.height, shape.size1);
          break;
        case 'Hexagon':
          // 六边形：6 段圆柱（六棱柱），注意不要添加 openEnded=true
          geometry = new CylinderGeometry(shape.size1, shape.size1, shape.height, 6);
          break;
        default:
          continue;
      }

      if (!geometry) {
        continue;
      }

      // 应用位置变换 - 直接修改几何体的顶点位置
      if (shape.position) {
        const matrix = new Matrix4().makeTranslation(
          shape.position.x,
          shape.position.y,
          shape.position.z
        );
        geometry.applyMatrix4(matrix);
      }

      geometries.push(geometry);
    }

    if (geometries.length === 0) {
      throw new Error('没有可导出的几何体');
    }

    // 合并所有几何体为单一几何体
    const mergedGeometry = mergeGeometries(geometries);

    // 创建统一材质（使用第一个可见部件的颜色）
    let materialColor = '#ffffff';
    for (let i = 1; i <= 4; i++) {
      const partData = chessData.parts[i.toString()];
      if (partData && partData.Appear === 'True' && partData.Shape?.color) {
        materialColor = partData.Shape.color;
        break;
      }
    }
    const material = new MeshStandardMaterial({ color: materialColor });

    // 创建单个网格对象
    const mesh = new Mesh(mergedGeometry, material);

    // 根据格式导出
    let blob;
    if (format.toLowerCase() === 'stl') {
      const exporter = new STLExporter();
      const result = exporter.parse(mesh, { binary: true });
      blob = new Blob([result], { type: 'application/octet-stream' });
    } else if (format.toLowerCase() === 'obj') {
      const exporter = new OBJExporter();
      const result = exporter.parse(mesh);
      blob = new Blob([result], { type: 'model/obj' });
    } else {
      throw new Error(`不支持的导出格式：${format}`);
    }

    return blob;
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
}

/**
 * 生成导出文件名
 * @param {string} chessName - 棋子名称
 * @param {string} format - 文件格式
 * @returns {string} - 文件名
 */
export function generateExportFilename(chessName, format) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const safeName = chessName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
  return `${safeName}_${timestamp}.${format}`;
}
