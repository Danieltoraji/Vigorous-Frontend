import {
  MeshStandardMaterial,
  CylinderGeometry,
  BoxGeometry,
  SphereGeometry,
  Mesh,
  Matrix4,
  BufferGeometry,
  Float32BufferAttribute,
  Vector3,
  LatheGeometry,
  Group,
  Shape,
  ExtrudeGeometry
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

function createSweepGeometry(profilePoints, pathPoints) {
  if (!profilePoints || profilePoints.length < 3 || !pathPoints || pathPoints.length < 3) {
    return null;
  }

  try {
    const profile3D = profilePoints.map(point => {
      const m = (point.x - 140) / 140;
      const n = (point.y - 75) / 8;
      return { m, n };
    });

    const path3D = pathPoints.map(point => {
      const x = (point.x - 140) / 4;
      const z = -(point.y - 75) / 4;
      return { x, z };
    });

    const vertices = [];
    const profileSteps = profile3D.length;
    const pathSteps = path3D.length;

    for (let i = 0; i < pathSteps; i++) {
      const pathPoint = path3D[i];

      for (let j = 0; j < profileSteps; j++) {
        const profilePoint = profile3D[j];
        const factor = 2;
        const X = factor * profilePoint.m * pathPoint.x;
        const Y = factor * (-profilePoint.n);
        const Z = factor * profilePoint.m * pathPoint.z;

        vertices.push(new Vector3(X, Y, Z));
      }
    }

    const positions = [];
    const indices = [];

    for (const vertex of vertices) {
      positions.push(vertex.x, vertex.y, vertex.z);
    }

    for (let i = 0; i < pathSteps - 1; i++) {
      for (let j = 0; j < profileSteps - 1; j++) {
        const a = i * profileSteps + j;
        const b = i * profileSteps + (j + 1);
        const c = (i + 1) * profileSteps + j;
        const d = (i + 1) * profileSteps + (j + 1);

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

function createLatheGeometryFromProfile(profilePoints) {
  if (!profilePoints || profilePoints.length < 3) {
    return null;
  }

  try {
    const profile3D = profilePoints.map(point => {
      const radius = (point.x - 140) / 8;
      const height = -(point.y - 75) / 8;
      return new Vector3(Math.abs(radius), height, 0);
    });

    return new LatheGeometry(profile3D, 64, 0, Math.PI * 2);
  } catch (error) {
    console.error('旋转体几何生成失败:', error);
    return null;
  }
}

function createSpecialGeometry(customShape) {
  if (!customShape || !customShape.profilePoints || customShape.profilePoints.length < 3) {
    return null;
  }

  const { profilePoints, pathPoints } = customShape;

  if (pathPoints && pathPoints.length >= 3) {
    return createSweepGeometry(profilePoints, pathPoints);
  } else {
    return createLatheGeometryFromProfile(profilePoints);
  }
}

function createRoundedCylinderGeometry(radius, height, radialSegments = 32, edgeType = 'none', edgeDepth = 0, edgeSegments = 4) {
  if (edgeType === 'none' || edgeDepth <= 0) {
    return new CylinderGeometry(radius, radius, height, radialSegments);
  }

  const safeDepth = Math.min(edgeDepth, height / 4, radius / 2);

  const shape = new Shape();
  const segments = Math.max(16, radialSegments);
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  shape.closePath();

  const extrudeSettings = {
    depth: height,
    bevelEnabled: true,
    bevelThickness: safeDepth,
    bevelSize: safeDepth,
    bevelSegments: edgeSegments,
    curveSegments: segments
  };

  const geometry = new ExtrudeGeometry(shape, extrudeSettings);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function createRoundedBoxGeometry(width, height, depth, edgeType = 'none', edgeDepth = 0, edgeSegments = 4) {
  if (edgeType === 'none' || edgeDepth <= 0) {
    return new BoxGeometry(width, height, depth, 1, 1, 1);
  }

  const minSize = Math.min(width, height, depth);
  const safeDepth = Math.min(edgeDepth, minSize / 4);

  const shape = new Shape();
  shape.moveTo(-width / 2, -depth / 2);
  shape.lineTo(width / 2, -depth / 2);
  shape.lineTo(width / 2, depth / 2);
  shape.lineTo(-width / 2, depth / 2);
  shape.closePath();

  const extrudeSettings = {
    depth: height,
    bevelEnabled: true,
    bevelThickness: safeDepth,
    bevelSize: safeDepth,
    bevelSegments: edgeSegments,
    curveSegments: 1
  };

  const geometry = new ExtrudeGeometry(shape, extrudeSettings);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, height / 2, 0);

  return geometry;
}

function createBaseGeometry(baseData) {
  if (!baseData || !baseData.shape) {
    return null;
  }

  const shape = baseData.shape;
  const { type, size1, size2, height, sides } = shape;
  const position = baseData.position || { x: 0, y: 0, z: 0 };
  const edge = baseData.edge || { type: 'none', depth: 0, segments: 4 };

  let geometry = null;

  switch (type) {
    case 'cycle':
      if (edge.type === 'smooth' || edge.type === 'round') {
        const segments = edge.type === 'round' ? 128 : (edge.segments || 4);
        geometry = createRoundedCylinderGeometry(size1 / 2, height, 512, 'smooth', edge.depth, segments);
      } else {
        geometry = new CylinderGeometry(size1, size2, height, 64);
      }
      break;

    case 'polygon':
      const polygonSides = sides || 6;
      if (edge.type === 'smooth' || edge.type === 'round') {
        const segments = edge.type === 'round' ? 128 : (edge.segments || 4);
        const radius = size1 / 2;
        const safeDepth = Math.min(edge.depth, Math.min(size1, size2, height) / 4);

        const polygonShape = new Shape();
        for (let i = 0; i < polygonSides; i++) {
          const angle = (i / polygonSides) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (i === 0) {
            polygonShape.moveTo(x, y);
          } else {
            polygonShape.lineTo(x, y);
          }
        }
        polygonShape.closePath();

        const extrudeSettings = {
          depth: height,
          bevelEnabled: true,
          bevelThickness: safeDepth,
          bevelSize: safeDepth,
          bevelSegments: segments,
          curveSegments: Math.max(1, polygonSides)
        };

        geometry = new ExtrudeGeometry(polygonShape, extrudeSettings);
        geometry.rotateX(-Math.PI / 2);
      } else {
        geometry = new CylinderGeometry(size1, size2, height, polygonSides);
      }
      break;

    case 'cube':
      if (edge.type === 'smooth' || edge.type === 'round') {
        const segments = edge.type === 'round' ? 128 : (edge.segments || 4);
        geometry = createRoundedBoxGeometry(size1, height, size2, 'smooth', edge.depth, segments);
      } else {
        geometry = new BoxGeometry(size1, height, size2);
      }
      break;

    case 'special':
      geometry = createSpecialGeometry(baseData.customShape);
      break;

    default:
      geometry = new CylinderGeometry(size1, size2, height, 64);
      break;
  }

  if (!geometry) {
    return null;
  }

  const matrix = new Matrix4();
  if (type === 'special') {
    matrix.makeTranslation(position.x, position.y, position.z);
  } else {
    matrix.makeTranslation(position.x, position.y + height / 2, position.z);
  }
  geometry.applyMatrix4(matrix);

  return geometry;
}

function createColumnGeometry(columnData, baseheight) {
  if (!columnData || !columnData.shape) {
    return null;
  }

  const shape = columnData.shape;
  const { type, size1, size2, height, sides } = shape;
  const position = columnData.position || { x: 0, y: 0, z: 0 };
  const edge = columnData.edge || { type: 'none', depth: 0, segments: 4 };

  let geometry = null;

  switch (type) {
    case 'cycle':
      if (edge.type === 'smooth' || edge.type === 'round') {
        const segments = edge.type === 'round' ? 128 : (edge.segments || 4);
        geometry = createRoundedCylinderGeometry(size1 / 2, height, 512, 'smooth', edge.depth, segments);
      } else {
        geometry = new CylinderGeometry(size1, size2, height, 64);
      }
      break;

    case 'polygon':
      const polygonSides = sides || 6;
      if (edge.type === 'smooth' || edge.type === 'round') {
        const segments = edge.type === 'round' ? 128 : (edge.segments || 4);
        const radius = size1 / 2;
        const safeDepth = Math.min(edge.depth, Math.min(size1, size2, height) / 4);

        const polygonShape = new Shape();
        for (let i = 0; i < polygonSides; i++) {
          const angle = (i / polygonSides) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (i === 0) {
            polygonShape.moveTo(x, y);
          } else {
            polygonShape.lineTo(x, y);
          }
        }
        polygonShape.closePath();

        const extrudeSettings = {
          depth: height,
          bevelEnabled: true,
          bevelThickness: safeDepth,
          bevelSize: safeDepth,
          bevelSegments: segments,
          curveSegments: Math.max(1, polygonSides)
        };

        geometry = new ExtrudeGeometry(polygonShape, extrudeSettings);
        geometry.rotateX(-Math.PI / 2);
      } else {
        geometry = new CylinderGeometry(size1, size2, height, polygonSides);
      }
      break;

    case 'cube':
      if (edge.type === 'smooth' || edge.type === 'round') {
        const segments = edge.type === 'round' ? 128 : (edge.segments || 4);
        geometry = createRoundedBoxGeometry(size1, height, size2, 'smooth', edge.depth, segments);
      } else {
        geometry = new BoxGeometry(size1, height, size2);
      }
      break;

    case 'special':
      geometry = createSpecialGeometry(columnData.customShape);
      break;

    default:
      geometry = new CylinderGeometry(size1, size2, height, 64);
      break;
  }

  if (!geometry) {
    return null;
  }

  const matrix = new Matrix4();
  if (type === 'special') {
    matrix.makeTranslation(position.x, baseheight + height / 2 + position.y, position.z);
  } else {
    matrix.makeTranslation(position.x, baseheight + height / 2 + position.y, position.z);
  }
  geometry.applyMatrix4(matrix);

  return geometry;
}

function createDecorationGeometry(decorationData) {
  if (!decorationData || !decorationData.modelId) {
    return null;
  }

  const position = decorationData.position || { x: 0, y: 0, z: 0 };
  const geometry = new SphereGeometry(2, 32, 32);

  const matrix = new Matrix4().makeTranslation(position.x, position.y, position.z);
  geometry.applyMatrix4(matrix);

  return geometry;
}

async function createPatternGeometry(patternData, componentPosition, componentHeight, baseheight, componentType) {
  if (!patternData || patternData.shape === 'none') {
    return null;
  }

  const { shape, position: patternPosition, size, depth, geometryType, sides, content } = patternData;
  let geometry = null;

  const posX = patternPosition?.x || 0;
  const posZ = patternPosition?.z || 0;
  const posY = componentPosition?.y || 0;

  switch (shape) {
    case 'text':
      try {
        const loader = new FontLoader();
        const font = await new Promise((resolve, reject) => {
          loader.load(
            'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
            resolve,
            undefined,
            reject
          );
        });

        const textGeometry = new TextGeometry(content || 'Text', {
          font: font,
          size: size || 5,
          height: depth || 1,
          curveSegments: 12
        });

        textGeometry.rotateX(-Math.PI / 2);

        let textY;
        if (componentType === 'column') {
          textY = baseheight + componentHeight + posY;
        } else {
          textY = posY + componentHeight;
        }

        const matrix = new Matrix4().makeTranslation(posX, textY, posZ);
        textGeometry.applyMatrix4(matrix);

        geometry = textGeometry;
      } catch (error) {
        console.error('文字几何体生成失败:', error);
        return null;
      }
      break;

    case 'geometry':
      let patternY;
      if (componentType === 'column') {
        patternY = baseheight + componentHeight + posY + (depth || 1) / 2;
      } else {
        patternY = posY + componentHeight + (depth || 1) / 2;
      }

      switch (geometryType) {
        case 'Circle':
          geometry = new CylinderGeometry(size, size, depth, 64);
          break;
        case 'Polygon':
          geometry = new CylinderGeometry(size, size, depth, sides || 6);
          break;
        case 'Cube':
          geometry = new BoxGeometry(size, depth, size);
          break;
        default:
          return null;
      }

      const matrix = new Matrix4().makeTranslation(posX, patternY, posZ);
      geometry.applyMatrix4(matrix);
      break;

    default:
      return null;
  }

  return geometry;
}

function createMaterial(materialData, defaultColor) {
  const {
    color = defaultColor,
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

export async function exportChessModel(chessData, format = 'stl') {
  try {
    if (!chessData || !chessData.parts) {
      throw new Error('无效的棋子数据');
    }

    console.log('导出棋子数据:', chessData);

    const meshes = [];
    const base = chessData.parts.base;
    const column = chessData.parts.column;
    const decoration = chessData.parts.decoration;

    const baseheight = base?.shape?.height || 0;

    if (base && base.shape) {
      const baseGeometry = createBaseGeometry(base);
      if (baseGeometry) {
        const baseMaterial = createMaterial(base.material, '#8B4513');
        const baseMesh = new Mesh(baseGeometry, baseMaterial);
        if (baseMesh && baseMesh.geometry) {
          meshes.push(baseMesh);
          console.log('成功添加 base 组件');
        }

        if (base.pattern && base.pattern.shape !== 'none') {
          const patternGeometry = await createPatternGeometry(
            base.pattern,
            base.position,
            base.shape.height,
            0,
            'base'
          );
          if (patternGeometry) {
            const patternMaterial = createMaterial(base.material, '#CD853F');
            const patternMesh = new Mesh(patternGeometry, patternMaterial);
            if (patternMesh && patternMesh.geometry) {
              meshes.push(patternMesh);
              console.log('成功添加 base 浮雕图案');
            }
          }
        }
      } else {
        console.warn('base 几何体生成失败，跳过该组件');
      }
    }

    if (column && column.shape) {
      const columnGeometry = createColumnGeometry(column, baseheight);
      if (columnGeometry) {
        const columnMaterial = createMaterial(column.material, '#CD853F');
        const columnMesh = new Mesh(columnGeometry, columnMaterial);
        if (columnMesh && columnMesh.geometry) {
          meshes.push(columnMesh);
          console.log('成功添加 column 组件');
        }

        if (column.pattern && column.pattern.shape !== 'none') {
          const patternGeometry = await createPatternGeometry(
            column.pattern,
            column.position,
            column.shape.height,
            baseheight,
            'column'
          );
          if (patternGeometry) {
            const patternMaterial = createMaterial(column.material, '#CD853F');
            const patternMesh = new Mesh(patternGeometry, patternMaterial);
            if (patternMesh && patternMesh.geometry) {
              meshes.push(patternMesh);
              console.log('成功添加 column 浮雕图案');
            }
          }
        }
      } else {
        console.warn('column 几何体生成失败，跳过该组件');
      }
    }

    if (decoration && decoration.modelId) {
      const decorationGeometry = createDecorationGeometry(decoration);
      if (decorationGeometry) {
        const decorationMaterial = createMaterial(decoration.material, '#FFD700');
        const decorationMesh = new Mesh(decorationGeometry, decorationMaterial);
        if (decorationMesh && decorationMesh.geometry) {
          meshes.push(decorationMesh);
          console.log('成功添加 decoration 组件');
        }
      } else {
        console.warn('decoration 几何体生成失败，跳过该组件');
      }
    }

    if (meshes.length === 0) {
      throw new Error('没有可导出的几何体，请检查模型是否包含可见的组件');
    }

    const allGeometries = meshes
      .map((mesh, index) => {
        if (!mesh || !mesh.geometry) {
          console.warn(`跳过无效网格 ${index}`);
          return null;
        }
        
        let geom = mesh.geometry.clone();
        
        if (!geom) {
          console.warn(`跳过无效几何体 ${index}: clone 返回 null`);
          return null;
        }

        if (geom.index !== null) {
          geom = geom.toNonIndexed();
        }

        if (!geom.attributes) {
          geom.attributes = {};
        }
        
        if (!geom.attributes.position) {
          console.warn(`跳过无效几何体 ${index}: 缺少 position 属性`);
          return null;
        }

        const vertexCount = geom.attributes.position.count;
        if (vertexCount <= 0) {
          console.warn(`跳过无效几何体 ${index}: 顶点数为 0`);
          return null;
        }

        if (!geom.attributes.uv) {
          const defaultUVs = new Float32BufferAttribute(vertexCount * 2, 2);
          for (let i = 0; i < vertexCount; i++) {
            defaultUVs.setXY(i, 0, 0);
          }
          geom.setAttribute('uv', defaultUVs);
        }

        if (!geom.attributes.normal) {
          geom.computeVertexNormals();
        }

        geom.morphAttributes = {};

        return geom;
      })
      .filter(geom => geom !== null);

    if (allGeometries.length === 0) {
      throw new Error('没有有效的几何体可以导出');
    }

    let mergedGeometry;
    try {
      mergedGeometry = mergeGeometries(allGeometries);
      console.log('几何体合并成功');
    } catch (mergeError) {
      console.error('几何体合并失败:', mergeError);
      throw new Error('几何体合并失败：' + mergeError.message);
    }

    const unifiedMaterial = meshes[0].material;
    const mergedMesh = new Mesh(mergedGeometry, unifiedMaterial);

    let blob;
    if (format.toLowerCase() === 'stl') {
      const exporter = new STLExporter();
      const result = exporter.parse(mergedMesh, { binary: true });
      blob = new Blob([result], { type: 'application/octet-stream' });
    } else if (format.toLowerCase() === 'obj') {
      const exporter = new OBJExporter();
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

    console.log(`导出成功！格式：${format}, 网格数量：${meshes.length}`);
    return blob;
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
}

export function generateExportFilename(chessName, format) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const safeName = chessName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
  return `${safeName}_${timestamp}.${format}`;
}
