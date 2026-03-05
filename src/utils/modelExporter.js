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

/**
 * 模型导出器 - 支持 Vigorous 模型编辑器的所有几何类型
 * 
 * 支持的几何体类型:
 * 1. 标准几何体:
 *    - cylinder: 圆柱体 (64 段)
 *    - polygon: 多边形棱柱 (可指定边数)
 *    - cube: 长方体/正方体
 * 
 * 2. 自定义几何体:
 *    - special (旋转体): 通过轮廓曲线绕 Y 轴旋转生成
 *    - special (扫掠体): 通过轮廓曲线沿路径曲线扫掠生成
 * 
 * 支持的组件:
 *    - base: 底座组件
 *    - column: 柱体组件
 *    - decoration: 装饰物组件
 * 
 * 支持的材质属性:
 *    - color: 颜色
 *    - metalness: 金属度 (0-1)
 *    - roughness: 粗糙度 (0-1)
 *    - clearcoat: 清漆层 (0-1)
 *    - clearcoatRoughness: 清漆层粗糙度 (0-1)
 * 
 * 导出格式:
 *    - STL: 二进制格式，适合 3D 打印
 *    - OBJ: 文本格式，保留材质信息
 */

/**
 * 从轮廓点和路径点生成扫掠几何体
 * @param {Array} profilePoints - 轮廓点数组 [{x, y}]
 * @param {Array} pathPoints - 路径点数组 [{x, y}]
 * @returns {BufferGeometry|null} - 生成的几何体
 */
function createSweepGeometry(profilePoints, pathPoints) {
  if (!profilePoints || profilePoints.length < 3 || !pathPoints || pathPoints.length < 3) {
    return null;
  }

  try {
    // 轮廓曲线坐标转换 (canvas -> (m,n))
    const profile3D = profilePoints.map(point => {
      const m = (point.x - 140) / 140;      // 归一化半径因子，范围 [-1, 1]
      const n = (point.y - 75) / 8;         // 高度
      return { m, n };
    });

    // 路径曲线坐标转换 (canvas -> (x,z))
    const path3D = pathPoints.map(point => {
      const x = (point.x - 140) / 8;   // canvas x -> 3D x
      const z = -(point.y - 75) / 8;   // canvas y -> 3D z
      return { x, z };
    });

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
        const factor = 2; // 缩放因子
        // 应用映射规则：X=m*x, Y=n, Z=m*z
        const X = factor * profilePoint.m * pathPoint.x;
        const Y = factor * (-profilePoint.n);
        const Z = factor * profilePoint.m * pathPoint.z;

        vertices.push(new Vector3(X, Y, Z));
      }
    }

    // 构建 BufferGeometry
    const positions = [];
    const indices = [];

    // 填充顶点位置
    for (const vertex of vertices) {
      positions.push(vertex.x, vertex.y, vertex.z);
    }

    // 构建索引（连接顶点形成面）
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

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  } catch (error) {
    console.error('扫掠几何体生成失败:', error);
    return null;
  }
}

/**
 * 从轮廓点生成旋转体几何
 * @param {Array} profilePoints - 轮廓点数组 [{x, y}]
 * @returns {LatheGeometry|null} - 生成的几何体
 */
function createLatheGeometry(profilePoints) {
  if (!profilePoints || profilePoints.length < 3) {
    return null;
  }

  try {
    // Canvas 坐标转换为 3D 坐标
    const profile3D = profilePoints.map(point => {
      const radius = (point.x - 140) / 8;      // 半径
      const height = -(point.y - 75) / 8;      // 高度（取负，因为 canvas y 向下为正）
      return new Vector3(Math.abs(radius), height, 0);
    });

    return new LatheGeometry(profile3D, 64, 0, Math.PI * 2);
  } catch (error) {
    console.error('旋转体几何生成失败:', error);
    return null;
  }
}

/**
 * 创建标准几何体
 * @param {Object} shape - 形状数据
 * @returns {BufferGeometry|null} - 生成的几何体
 */
function createPrimitiveGeometry(shape) {
  if (!shape || !shape.type) {
    return null;
  }

  const { type, size1, size2, height, sides } = shape;

  switch (type) {
    case 'cylinder':
      return new CylinderGeometry(size1, size2, height, 64);
    
    case 'polygon':
      const polygonSides = sides || 6;
      return new CylinderGeometry(size1, size2, height, polygonSides);
    
    case 'cube':
      return new BoxGeometry(size1, height, size2);
    
    default:
      console.warn('未知的几何体类型:', type);
      return null;
  }
}

/**
 * 创建材质
 * @param {Object} materialData - 材质数据
 * @returns {MeshStandardMaterial} - 创建的材质
 */
function createMaterial(materialData) {
  const { 
    color = '#ffffff', 
    metalness = 0.3, 
    roughness = 0.4, 
    clearcoat = 0, 
    clearcoatRoughness = 0 
  } = materialData || {};

  return new MeshStandardMaterial({
    color,
    metalness,
    roughness,
    clearcoat,
    clearcoatRoughness
  });
}

/**
 * 导出棋子模型为指定格式
 * @param {Object} chessData - 棋子数据对象
 * @param {string} format - 导出格式 ('stl' 或 'obj')
 * @returns {Blob} - 导出的文件 Blob
 */
export async function exportChessModel(chessData, format = 'stl') {
  try {
    if (!chessData || !chessData.parts) {
      throw new Error('无效的棋子数据');
    }

    const geometries = [];
    const meshes = [];
    
    // 处理所有组件（base, column, decoration）
    const components = ['base', 'column', 'decoration'];
    
    for (const component of components) {
      const partData = chessData.parts[component];
      
      if (!partData) {
        continue;
      }

      // 检查组件是否可见
      const isVisible = partData.Appear !== 'False';
      if (!isVisible) {
        continue;
      }

      let geometry = null;
      let materialData = partData.material || {};

      // 根据组件类型处理几何体
      if (component === 'decoration') {
        // 装饰物：简单的球体或其他预设形状
        if (partData.modelId) {
          // 使用默认装饰模型（球体）
          geometry = new CylinderGeometry(2, 2, 2, 32);
        }
        
        // 应用装饰物的位置
        if (geometry && partData.position) {
          const matrix = new Matrix4().makeTranslation(
            partData.position.x || 0,
            partData.position.y || 0,
            partData.position.z || 0
          );
          geometry.applyMatrix4(matrix);
        }
      } else {
        // base 或 column
        const shape = partData.shape;
        
        if (!shape) {
          continue;
        }

        // 检查是否为异形（special）
        if (shape.type === 'special') {
          const customShape = partData.customShape || { profilePoints: [], pathPoints: [] };
          
          // 优先尝试扫掠几何（有路径曲线）
          if (customShape.pathPoints && customShape.pathPoints.length >= 3) {
            geometry = createSweepGeometry(customShape.profilePoints, customShape.pathPoints);
          } 
          // 否则使用旋转体
          else if (customShape.profilePoints && customShape.profilePoints.length >= 3) {
            geometry = createLatheGeometry(customShape.profilePoints);
          }
        } else {
          // 标准几何体
          geometry = createPrimitiveGeometry(shape);
        }

        // 应用位置变换
        if (geometry && shape.position) {
          const matrix = new Matrix4().makeTranslation(
            shape.position.x || 0,
            shape.position.y || 0,
            shape.position.z || 0
          );
          geometry.applyMatrix4(matrix);
        }
      }

      if (!geometry) {
        continue;
      }

      // 创建材质并添加网格
      const material = createMaterial(materialData);
      const mesh = new Mesh(geometry, material);
      meshes.push(mesh);
    }

    if (meshes.length === 0) {
      throw new Error('没有可导出的几何体');
    }

    // 方案 1：合并所有几何体为单一网格（推荐用于 STL）
    const allGeometries = meshes.map(mesh => mesh.geometry);
    const mergedGeometry = mergeGeometries(allGeometries);
    
    // 使用第一个网格的材质作为统一材质
    const unifiedMaterial = meshes[0].material;
    const mergedMesh = new Mesh(mergedGeometry, unifiedMaterial);

    // 根据格式导出
    let blob;
    if (format.toLowerCase() === 'stl') {
      const exporter = new STLExporter();
      // STL 格式：导出为单个合并的网格
      const result = exporter.parse(mergedMesh, { binary: true });
      blob = new Blob([result], { type: 'application/octet-stream' });
    } else if (format.toLowerCase() === 'obj') {
      const exporter = new OBJExporter();
      // OBJ 格式：可以导出多个独立网格（保留材质信息）
      const group = new Group();
      meshes.forEach(mesh => {
        const meshCopy = mesh.clone();
        group.add(meshCopy);
      });
      const result = exporter.parse(group);
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