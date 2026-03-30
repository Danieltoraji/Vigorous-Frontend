import React, { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Environment, Text3D } from '@react-three/drei';
import * as THREE from 'three';
import { ModelPreview } from '../../../Components/CustomRevolutionGenerator/CustomRevolutionGenerator.jsx';

// 从 THREE 命名空间获取常用几何体和工具
const { AxesHelper, ExtrudeGeometry, Shape, TextureLoader, Float32BufferAttribute, MeshStandardMaterial, LineSegments, LineBasicMaterial, BufferGeometry, Vector3 } = THREE;

/**
 * 创建无限网格 - 使用LineSegments，不创建实体
 * @param {number} size 网格范围
 * @param {number} divisions 分割数
 * @returns {THREE.LineSegments} 网格线条
 */
function createGridLines(size = 200, divisions = 100) {
    const geometry = new BufferGeometry();
    const positions = [];

    const step = size / divisions;
    const halfSize = size / 2;

    // 绘制网格线
    for (let i = 0; i <= divisions; i++) {
        const pos = -halfSize + i * step;

        // X方向平行线
        positions.push(pos, 0, -halfSize);
        positions.push(pos, 0, halfSize);

        // Z方向平行线
        positions.push(-halfSize, 0, pos);
        positions.push(halfSize, 0, pos);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    const material = new LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.5 });
    return new LineSegments(geometry, material);
}

/**
 * 创建坐标轴 - 使用LineSegments，不创建实体
 * @param {number} length 轴线长度
 * @param {number} thickness 轴线粗度（通过渲染时放大实现）
 * @returns {Array<THREE.LineSegments>} 三个轴线对象
 */
function createAxisLines(length = 80, thickness = 2) {
    const axes = [];

    // X轴 - 红色
    const xGeometry = new BufferGeometry();
    xGeometry.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array([0, 0, 0, length, 0, 0]), 3
    ));
    const xMaterial = new LineBasicMaterial({ color: 0xff0000, linewidth: thickness });
    const xAxis = new LineSegments(xGeometry, xMaterial);
    axes.push(xAxis);

    // Y轴 - 绿色
    const yGeometry = new BufferGeometry();
    yGeometry.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array([0, 0, 0, 0, length, 0]), 3
    ));
    const yMaterial = new LineBasicMaterial({ color: 0x00ff00, linewidth: thickness });
    const yAxis = new LineSegments(yGeometry, yMaterial);
    axes.push(yAxis);

    // Z轴 - 蓝色
    const zGeometry = new BufferGeometry();
    zGeometry.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array([0, 0, 0, 0, 0, length]), 3
    ));
    const zMaterial = new LineBasicMaterial({ color: 0x0000ff, linewidth: thickness });
    const zAxis = new LineSegments(zGeometry, zMaterial);
    axes.push(zAxis);

    return axes;
}

// 创建纹理加载器实例
const textureLoader = new TextureLoader();

/**
 * 从灰度图生成体素网格几何体（只有顶面）
 * @param {string} textureFile - 灰度图路径
 * @param {number} size - 平面尺寸
 * @param {number} depth - 最大深度（高度）
 * @param {number} sampleRate - 采样率（每隔几个像素取一个点）
 */
function VoxelGeometry({ textureFile, size = 10, depth = 1, sampleRate = 4 }) {
  const [geometry, setGeometry] = useState(null);

  useEffect(() => {
    if (!textureFile) {
      setGeometry(null);
      return;
    }

    const loadTextureAndCreateGeometry = async () => {
      try {
        const texture = await new Promise((resolve, reject) => {
          textureLoader.load(
            textureFile,
            resolve,
            undefined,
            reject
          );
        });

        const image = texture.image;
        if (!image) {
          console.warn('纹理图像未加载完成');
          return;
        }

        const width = image.width;
        const height = image.height;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // 存储所有体素点的高度值
        const heightMap = [];
        const step = sampleRate;
        
        // 采样生成高度图
        for (let y = 0; y < height; y += step) {
          for (let x = 0; x < width; x += step) {
            const idx = (y * width + x) * 4;
            // 计算灰度值 (0-1)
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / (3 * 255);
            // 映射到高度（黑色=最高，白色=最低），不应用 scaleZ，由 group 的 scale 统一处理
            const h = (1 - gray) * depth;
            heightMap.push({ x, y, height: h });
          }
        }
        
         // 生成网格顶点和索引（只有顶面）
        const positions = [];
        const indices = [];
        
        const gridWidth = Math.floor(width / step);
        const gridHeight = Math.floor(height / step);
        const planeSize = size / Math.max(gridWidth, gridHeight);
        
        // 生成顶点
        for (let i = 0; i < heightMap.length; i++) {
          const point = heightMap[i];
          // 直接生成在 XZ 平面，高度沿 Y 轴
          const px = (point.x - width / 2) * planeSize;
          const py = point.height;
          const pz = -(point.y - height / 2) * planeSize;
          
          positions.push(px, py, pz);
        }
        
        // 生成三角形索引（连接相邻点）
        for (let row = 0; row < gridHeight - 1; row++) {
          for (let col = 0; col < gridWidth - 1; col++) {
            const a = row * gridWidth + col;
            const b = row * gridWidth + (col + 1);
            const c = (row + 1) * gridWidth + col;
            const d = (row + 1) * gridWidth + (col + 1);
            
            // 两个三角形组成一个四边形
            // 三角形 1: a-b-c
            indices.push(a, b, c);
            // 三角形 2: b-d-c
            indices.push(b, d, c);
          }
        }
        
        // 创建几何体
        const geom = new BufferGeometry();
        geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
        geom.setIndex(indices);
        geom.computeVertexNormals();
        
        console.log('体素几何体创建成功:', {
          vertexCount: positions.length / 3,
          triangleCount: indices.length / 3,
          gridSize: `${gridWidth}x${gridHeight}`
        });
        
        setGeometry(geom);
      } catch (error) {
        console.error('体素几何体创建失败:', error);
        setGeometry(null);
      }
    };

    loadTextureAndCreateGeometry();
  }, [textureFile, size, depth, sampleRate]);

  if (!geometry) return null;

  return <primitive object={geometry} />;
}

/**
 * SceneContent component - contains all scene objects and model rendering logic
 * This component has access to the Three.js scene via useThree() hook
 */
function SceneContent({ chess, onModelReady, hdrFile }) {
    const modelRootRef = useRef();

    // Notify parent when model is ready
    useEffect(() => {
        if (onModelReady && modelRootRef.current) {
            onModelReady(modelRootRef.current);
        }
    }, [onModelReady]);

    // 添加安全检查，防止 undefined 错误
    if (!chess) {
        return (
            <>
                <OrbitControls />
                <ambientLight intensity={2.5} />
                <pointLight position={[10, 10, 10]} />
                <Text position={[0, 0, 0]} fontSize={1} color="red">
                    Invalid chess data
                </Text>
            </>
        );
    }

    // 根据实际数据结构获取组件数据
    const base = chess.parts?.base;
    const column = chess.parts?.column;
    const decoration = chess.parts?.decoration;

    // 确保组件数据存在
    const hasBase = base && base.shape;
    const hasColumn = column && column.shape;
    const hasDecoration = decoration;

    // 提取基础形状数据
    const baseShape = hasBase ? base.shape : null;
    const columnShape = hasColumn ? column.shape : null;

    // 渲染底座组件（带边缘处理）
    const renderBaseShape = () => {
        if (!hasBase) return null;

        const { type, size1, size2, height } = baseShape;
        const position = base.position || { x: 0, y: 0, z: 0 };
        const material = base.material || { metalness: 0.3, roughness: 0.4, clearcoat: 0, clearcoatRoughness: 0 };
        const pattern = base.pattern || { shape: 'none', position: { x: 0, y: 0, z: 0 } };
        const edge = base.edge || { type: 'none', depth: 0, segments: 4 };

        // 渲染主体元素 
        let bodyelement = null;

        // 根据边缘处理类型创建几何体
        const createGeometry = (geoType, args) => {
            if (edge.type === 'none' || !edge.depth || edge.depth === 0) {
                // 无边缘处理，直接创建标准几何体
                if (geoType === 'cylinder') {
                    return <cylinderGeometry args={args} />;
                } else if (geoType === 'box') {
                    return <boxGeometry args={args} />;
                }
            } else {
                // 有边缘处理，使用 ExtrudeGeometry 实现倒角效果
                const shape = new Shape();
                const radius = geoType === 'cylinder' ? Math.max(size1, size2) : Math.max(size1, size2) / 2;
                const halfWidth = geoType === 'box' ? size1 / 2 : radius;

                if (edge.type === 'smooth') {
                    // 平滑：创建带倒角的圆形
                    const segments = edge.segments || 4;
                    const bevelSize = edge.depth || 0.1;

                    // 绘制圆形路径，在顶部和底部添加倒角
                    for (let i = 0; i <= 1024; i++) {
                        const angle = (i / 1024) * Math.PI * 2;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        if (i === 0) {
                            shape.moveTo(x, y);
                        } else {
                            shape.lineTo(x, y);
                        }
                    }

                    const extrudeSettings = {
                        depth: height,
                        bevelEnabled: true,
                        bevelThickness: bevelSize,
                        bevelSize: bevelSize,
                        bevelSegments: segments,
                        curveSegments: 16
                    };

                    shape.closePath();
                    const geometry = new ExtrudeGeometry(shape, extrudeSettings);
                    geometry.rotateX(Math.PI / 2);
                    geometry.translate(0, height / 2, 0);
                    return <primitive object={geometry} />;
                } else if (edge.type === 'round') {
                    // 圆滑：创建带圆角的形状，使用固定的高分段数
                    const bevelSize = edge.depth || 0.1;
                    const segments = 256; // 固定使用 256 分段数，实现极致圆滑

                    for (let i = 0; i <= 1024; i++) {
                        const angle = (i / 1024) * Math.PI * 2;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        if (i === 0) {
                            shape.moveTo(x, y);
                        } else {
                            shape.lineTo(x, y);
                        }
                    }

                    const extrudeSettings = {
                        depth: height,
                        bevelEnabled: true,
                        bevelThickness: bevelSize,
                        bevelSize: bevelSize,
                        bevelSegments: segments,
                        curveSegments: 16
                    };

                    shape.closePath();
                    const geometry = new ExtrudeGeometry(shape, extrudeSettings);
                    geometry.rotateX(Math.PI / 2);
                    geometry.translate(0, height / 2, 0);
                    return <primitive object={geometry} />;
                }
            }

            // 默认返回标准几何体
            if (geoType === 'cylinder') {
                return <cylinderGeometry args={args} />;
            } else if (geoType === 'box') {
                return <boxGeometry args={args} />;
            }
        };

        switch (type) {
            case 'cycle':
                bodyelement = (
                    <mesh position={[position.x, position.y + height / 2, position.z]} castShadow receiveShadow>
                        {createGeometry('cylinder', [size1, size2, height, 64])}
                        <meshStandardMaterial
                            color="#8B4513"
                            metalness={material.metalness}
                            roughness={material.roughness}
                            clearcoat={material.clearcoat}
                            clearcoatRoughness={material.clearcoatRoughness}
                        />
                    </mesh>
                ); break;
            case 'polygon':
                const baseSides = baseShape.sides || 6;
                bodyelement = (
                    <mesh position={[position.x, position.y + height / 2, position.z]} castShadow receiveShadow>
                        {createGeometry('cylinder', [size1, size2, height, baseSides])}
                        <meshStandardMaterial
                            color="#8B4513"
                            metalness={material.metalness}
                            roughness={material.roughness}
                            clearcoat={material.clearcoat}
                            clearcoatRoughness={material.clearcoatRoughness}
                        />
                    </mesh>
                ); break;
            case 'cube':
                bodyelement = (
                    <mesh position={[position.x, position.y + height / 2, position.z]} castShadow receiveShadow>
                        {createGeometry('box', [size1, height, size2])}
                        <meshStandardMaterial
                            color="#8B4513"
                            metalness={material.metalness}
                            roughness={material.roughness}
                            clearcoat={material.clearcoat}
                            clearcoatRoughness={material.clearcoatRoughness}
                        />
                    </mesh>
                ); break;
            case 'special': // 异形类型
                const baseCustomShape = base.customShape || { profilePoints: [], pathPoints: [], generated: false };
                bodyelement = (
                    <group position={[position.x, position.y, position.z]}>
                        <ModelPreview
                            profilePoints={baseCustomShape.profilePoints}
                            pathPoints={baseCustomShape.pathPoints}
                            triggerSignal={baseCustomShape.generated ? 1 : 0}
                        />
                    </group>
                ); break;
            default:
                bodyelement = (
                    <mesh position={[position.x, position.y + height / 2, position.z]} castShadow receiveShadow>
                        <cylinderGeometry args={[size1, size2, height, 64]} />
                        <meshStandardMaterial
                            color="#8B4513"
                            metalness={material.metalness}
                            roughness={material.roughness}
                            clearcoat={material.clearcoat}
                            clearcoatRoughness={material.clearcoatRoughness}
                        />
                    </mesh>
                ); break;
        }

        //浮雕图案
        let patternelement = null;

        switch (pattern.shape) {
            case 'none':
                patternelement = null;
                break;
            case 'text':
                patternelement = (
                    <mesh position={[pattern.position?.x || 0, position.y + height + (pattern.position?.y || 0), pattern.position?.z || 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
                        <Text3D
                            font={"https://threejs.org/examples/fonts/helvetiker_regular.typeface.json"}
                            size={pattern.size || 5}
                            height={pattern.depth || 1}
                            curveSegments={12}
                        >
                            {pattern.content}
                            <meshStandardMaterial
                                color="#CD853F"
                                metalness={material.metalness}
                                roughness={material.roughness}
                                clearcoat={material.clearcoat}
                                clearcoatRoughness={material.clearcoatRoughness}
                            />
                        </Text3D>
                    </mesh>
                );
                break;
            case 'geometry':
                switch (pattern.geometryType) {
                    case 'Circle':
                        patternelement = (
                            <mesh 
                                position={[pattern.position?.x || 0, position.y + height + pattern.depth / 2 + (pattern.position?.y || 0), pattern.position?.z || 0]} 
                                scale={[pattern.scaleX || 1, pattern.scaleY || 1, pattern.scaleZ || 1]}
                                castShadow 
                                receiveShadow
                            >
                                <cylinderGeometry args={[pattern.size, pattern.size, pattern.depth, 64]} />
                                <meshStandardMaterial
                                    color="#8B4513"
                                    metalness={material.metalness}
                                    roughness={material.roughness}
                                    clearcoat={material.clearcoat}
                                    clearcoatRoughness={material.clearcoatRoughness}
                                />
                            </mesh>
                        )
                        break;
                    case 'Polygon':
                        patternelement = (
                            <mesh 
                                position={[pattern.position?.x || 0, position.y + height + pattern.depth / 2 + (pattern.position?.y || 0), pattern.position?.z || 0]} 
                                scale={[pattern.scaleX || 1, pattern.scaleY || 1, pattern.scaleZ || 1]}
                                castShadow 
                                receiveShadow
                            >
                                <cylinderGeometry args={[pattern.size, pattern.size, pattern.depth, pattern.sides || 6]} />
                                <meshStandardMaterial
                                    color="#8B4513"
                                    metalness={material.metalness}
                                    roughness={material.roughness}
                                    clearcoat={material.clearcoat}
                                    clearcoatRoughness={material.clearcoatRoughness}
                                />
                            </mesh>
                        )
                        break;
                    case 'Cube':
                        patternelement = (
                            <mesh 
                                position={[pattern.position?.x || 0, position.y + height + pattern.depth / 2, pattern.position?.z || 0]} 
                                scale={[pattern.scaleX || 1, pattern.scaleY || 1, pattern.scaleZ || 1]}
                                castShadow 
                                receiveShadow
                            >
                                <boxGeometry args={[pattern.size, pattern.depth, pattern.size]} />
                                <meshStandardMaterial
                                    color="#8B4513"
                                    metalness={material.metalness}
                                    roughness={material.roughness}
                                    clearcoat={material.clearcoat}
                                    clearcoatRoughness={material.clearcoatRoughness}
                                />
                            </mesh>
                        )
                        break;
                    case 'strange':
                        // 奇异形状 - 使用 ModelPreview 组件渲染异形模型
                        const profilePoints = pattern.customShape?.profilePoints || [];
                        const pathPoints = pattern.customShape?.pathPoints || [];
                        patternelement = (
                            <group position={[pattern.position?.x || 0, position.y + height + pattern.depth / 2 + (pattern.position?.y || 0), pattern.position?.z || 0]}>
                                <ModelPreview
                                    profilePoints={profilePoints}
                                    pathPoints={pathPoints}
                                    triggerSignal={pattern.customShape?.generated ? 1 : 0}
                                />
                            </group>
                        )
                        break;
                    default:
                        patternelement = null;
                        break;
                }

                break;
            case 'custom':
                // 自定义纹理 - 使用体素网格生成浮雕（只有顶面）
                console.log('渲染自定义纹理 - Base:', pattern);
                if (pattern.textureFile) {
                    console.log('纹理路径:', pattern.textureFile);
                    patternelement = (
                        <mesh 
                            position={[pattern.position?.x || 0, position.y + height + pattern.depth / 2 + (pattern.position?.y || 0), pattern.position?.z || 0]} 
                            scale={[pattern.scaleX || 1, pattern.scaleY || 1, pattern.scaleZ || 1]}
                            castShadow 
                            receiveShadow
                        >
                            <VoxelGeometry 
                                textureFile={pattern.textureFile}
                                size={pattern.size || 10}
                                depth={pattern.depth || 1}
                                sampleRate={1} // 每个像素都采样，最细腻的效果
                            />
                            <meshStandardMaterial
                                color="#CD853F"
                                metalness={material.metalness}
                                roughness={material.roughness}
                                clearcoat={material.clearcoat}
                                clearcoatRoughness={material.clearcoatRoughness}
                            />
                        </mesh>
                    );
                } else {
                    console.log('缺少 textureFile 字段');
                }
                break;
            default:
                patternelement = null;
                break;
        }
        return (
            <group>
                {bodyelement}
                {patternelement}
            </group>
        );
    };

    // 渲染柱体组件（带边缘处理）
    const renderColumnShape = () => {
        if (!hasColumn) return null;

        const { type, size1, size2, height } = columnShape;
        const position = column.position || { x: 0, y: 0, z: 0 };
        const material = column.material || { metalness: 0.3, roughness: 0.4, clearcoat: 0, clearcoatRoughness: 0 };
        const pattern = column.pattern || { shape: 'none' };
        const edge = column.edge || { type: 'none', depth: 0, segments: 4 };
        const baseheight = base.shape.height || 0;
        let bodyelement = null;

        // 根据边缘处理类型创建几何体
        const createGeometry = (geoType, args) => {
            if (edge.type === 'none' || !edge.depth || edge.depth === 0) {
                // 无边缘处理，直接创建标准几何体
                if (geoType === 'cylinder') {
                    return <cylinderGeometry args={args} />;
                } else if (geoType === 'box') {
                    return <boxGeometry args={args} />;
                }
            } else {
                // 有边缘处理，使用 ExtrudeGeometry 实现倒角效果
                const shape = new Shape();
                const radius = geoType === 'cylinder' ? Math.max(size1, size2) : Math.max(size1, size2) / 2;

                if (edge.type === 'smooth') {
                    // 平滑：创建带倒角的圆形
                    const segments = edge.segments || 4;
                    const bevelSize = edge.depth || 0.1;

                    // 绘制圆形路径
                    for (let i = 0; i <= 1024; i++) {
                        const angle = (i / 1024) * Math.PI * 2;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        if (i === 0) {
                            shape.moveTo(x, y);
                        } else {
                            shape.lineTo(x, y);
                        }
                    }

                    const extrudeSettings = {
                        depth: height,
                        bevelEnabled: true,
                        bevelThickness: bevelSize,
                        bevelSize: bevelSize,
                        bevelSegments: segments,
                        curveSegments: 16
                    };

                    shape.closePath();
                    const geometry = new ExtrudeGeometry(shape, extrudeSettings);
                    geometry.rotateX(Math.PI / 2);
                    geometry.translate(0, height / 2, 0);
                    return <primitive object={geometry} />;
                } else if (edge.type === 'round') {
                    // 圆滑：创建带圆角的形状，使用固定的高分段数
                    const bevelSize = edge.depth || 0.1;
                    const segments = 256; // 固定使用 256 分段数，实现极致圆滑

                    // 绘制带圆角的圆形
                    for (let i = 0; i <= 1024; i++) {
                        const angle = (i / 1024) * Math.PI * 2;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        if (i === 0) {
                            shape.moveTo(x, y);
                        } else {
                            shape.lineTo(x, y);
                        }
                    }

                    const extrudeSettings = {
                        depth: height,
                        bevelEnabled: true,
                        bevelThickness: bevelSize,
                        bevelSize: bevelSize,
                        bevelSegments: segments,
                        curveSegments: 16
                    };

                    shape.closePath();
                    const geometry = new ExtrudeGeometry(shape, extrudeSettings);
                    geometry.rotateX(Math.PI / 2);
                    geometry.translate(0, height / 2, 0);
                    return <primitive object={geometry} />;
                }
            }

            // 默认返回标准几何体
            if (geoType === 'cylinder') {
                return <cylinderGeometry args={args} />;
            } else if (geoType === 'box') {
                return <boxGeometry args={args} />;
            }
        };

        console.log(type);
        switch (type) {
            case 'cycle':
                bodyelement = (
                    <mesh position={[position.x, baseheight + height / 2 + position.y, position.z]} castShadow receiveShadow>
                        {createGeometry('cylinder', [size1, size2, height, 64])}
                        <meshStandardMaterial
                            color="#CD853F"
                            metalness={material.metalness}
                            roughness={material.roughness}
                            clearcoat={material.clearcoat}
                            clearcoatRoughness={material.clearcoatRoughness}
                        />
                    </mesh>
                );
                break;
            case 'polygon':
                const columnSides = columnShape.sides || 6;
                bodyelement = (
                    <mesh position={[position.x, baseheight + height / 2 + position.y, position.z]} castShadow receiveShadow>
                        {createGeometry('cylinder', [size1, size2, height, columnSides])}
                        <meshStandardMaterial
                            color="#CD853F"
                            metalness={material.metalness}
                            roughness={material.roughness}
                            clearcoat={material.clearcoat}
                            clearcoatRoughness={material.clearcoatRoughness}
                        />
                    </mesh>
                ); break;
            case 'cube':
                bodyelement = (
                    <mesh position={[position.x, baseheight + height / 2 + position.y, position.z]} castShadow receiveShadow>
                        {createGeometry('box', [size1, height, size2])}
                        <meshStandardMaterial
                            color="#CD853F"
                            metalness={material.metalness}
                            roughness={material.roughness}
                            clearcoat={material.clearcoat}
                            clearcoatRoughness={material.clearcoatRoughness}
                        />
                    </mesh>
                );
                break;

            case 'special': // 异形类型
                const columnCustomShape = column.customShape || { profilePoints: [], pathPoints: [], generated: false };
                bodyelement = (
                    <group position={[position.x, baseheight + height / 2 + position.y, position.z]}>
                        <ModelPreview
                            profilePoints={columnCustomShape.profilePoints}
                            pathPoints={columnCustomShape.pathPoints}
                            triggerSignal={columnCustomShape.generated ? 1 : 0}
                        />
                    </group>
                ); break;
            default:
                break;
        }
        //浮雕部分
        let patternelement = null;
        let patternheight = baseheight + height + position.y + pattern.depth / 2 + (pattern.position?.y || 0)
        switch (pattern.shape) {
            case 'none':
                patternelement = null;
                break;
            case 'text':
                patternelement = (
                    <mesh position={[pattern.position?.x || 0, baseheight + height + position.y + pattern.position?.y || 0, pattern.position?.z || 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
                        <Text3D
                            font={"https://threejs.org/examples/fonts/helvetiker_regular.typeface.json"}
                            size={pattern.size || 5}
                            height={pattern.depth || 1}
                            curveSegments={12}
                        >
                            {pattern.content}
                            <meshStandardMaterial
                                color="#CD853F"
                                metalness={material.metalness}
                                roughness={material.roughness}
                                clearcoat={material.clearcoat}
                                clearcoatRoughness={material.clearcoatRoughness}
                            />
                        </Text3D>
                    </mesh>
                );
                break;
            case 'geometry':
                switch (pattern.geometryType) {
                    case 'Circle':
                        patternelement = (
                            <mesh 
                                position={[pattern.position?.x || 0, patternheight, pattern.position?.z || 0]} 
                                scale={[pattern.scaleX || 1, pattern.scaleY || 1, pattern.scaleZ || 1]}
                                castShadow 
                                receiveShadow
                            >
                                <cylinderGeometry args={[pattern.size, pattern.size, pattern.depth, 64]} />
                                <meshStandardMaterial
                                    color="#CD853F"
                                    metalness={material.metalness}
                                    roughness={material.roughness}
                                    clearcoat={material.clearcoat}
                                    clearcoatRoughness={material.clearcoatRoughness}
                                />
                            </mesh>
                        )
                        break;
                    case 'Polygon':
                        patternelement = (
                            <mesh 
                                position={[pattern.position?.x || 0, patternheight, pattern.position?.z || 0]} 
                                scale={[pattern.scaleX || 1, pattern.scaleY || 1, pattern.scaleZ || 1]}
                                castShadow 
                                receiveShadow
                            >
                                <cylinderGeometry args={[pattern.size, pattern.size, pattern.depth, pattern.sides || 6]} />
                                <meshStandardMaterial
                                    color="#CD853F"
                                    metalness={material.metalness}
                                    roughness={material.roughness}
                                    clearcoat={material.clearcoat}
                                    clearcoatRoughness={material.clearcoatRoughness}
                                />
                            </mesh>
                        )
                        break;
                    case 'Cube':
                        patternelement = (
                            <mesh 
                                position={[pattern.position?.x || 0, patternheight, pattern.position?.z || 0]} 
                                scale={[pattern.scaleX || 1, pattern.scaleY || 1, pattern.scaleZ || 1]}
                                castShadow 
                                receiveShadow
                            >
                                <boxGeometry args={[pattern.size, pattern.depth, pattern.size]} />
                                <meshStandardMaterial
                                    color="#CD853F"
                                    metalness={material.metalness}
                                    roughness={material.roughness}
                                    clearcoat={material.clearcoat}
                                    clearcoatRoughness={material.clearcoatRoughness}
                                />
                            </mesh>
                        )
                        break;
                    case 'strange':
                        // 奇异形状 - 使用 ModelPreview 组件渲染异形模型
                        const profilePoints = pattern.customShape?.profilePoints || [];
                        const pathPoints = pattern.customShape?.pathPoints || [];
                        patternelement = (
                            <group position={[pattern.position?.x || 0, patternheight, pattern.position?.z || 0]}>
                                <ModelPreview
                                    profilePoints={profilePoints}
                                    pathPoints={pathPoints}
                                    triggerSignal={pattern.customShape?.generated ? 1 : 0}
                                />
                            </group>
                        )
                        break;
                    default:
                        patternelement = null;
                        break;
                }

                break;
            case 'custom':
                // 自定义纹理 - 使用体素网格生成浮雕（只有顶面）
                console.log('渲染自定义纹理 - Column:', pattern);
                if (pattern.textureFile) {
                    console.log('纹理路径:', pattern.textureFile);
                    patternelement = (
                        <mesh 
                            position={[pattern.position?.x || 0, patternheight, pattern.position?.z || 0]} 
                            scale={[pattern.scaleX || 1, pattern.scaleY || 1, pattern.scaleZ || 1]}
                            castShadow 
                            receiveShadow
                        >
                            <VoxelGeometry 
                                textureFile={pattern.textureFile}
                                size={pattern.size || 10}
                                depth={pattern.depth || 1}
                                sampleRate={2}
                            />
                            <meshStandardMaterial
                                color="#CD853F"
                                metalness={material.metalness}
                                roughness={material.roughness}
                                clearcoat={material.clearcoat}
                                clearcoatRoughness={material.clearcoatRoughness}
                            />
                        </mesh>
                    );
                } else {
                    console.log('缺少 textureFile 字段');
                }
                break;
            default:
                patternelement = null;
                break;
        }

        return (
            <group>
                {bodyelement}
                {patternelement}
            </group>
        );
    };
    //渲染装饰层组件
    const renderDecoration = (decoration) => {
        if (!decoration) return null;

        const { modelId, size, position, rotation, material } = decoration;
        const size1 = size?.size1 || 1;
        const size2 = size?.size2 || 1;
        const size3 = size?.size3 || 1;
        const pos = position || { x: 0, y: 0, z: 0 };
        const rot = rotation || { x: 0, y: 0, z: 0 };
        const rotRad = {
            x: (rot.x * Math.PI) / 180,
            y: (rot.y * Math.PI) / 180,
            z: (rot.z * Math.PI) / 180
        };
        const mat = material || { metalness: 0.3, roughness: 0.4, clearcoat: 0, clearcoatRoughness: 0 };

        switch (modelId) {
            case "0":
                return null;
            case "1":
                return (
                    <group
                        position={[pos.x, pos.y, pos.z]}
                        rotation={[rotRad.x, rotRad.y, rotRad.z]}
                    >
                        <mesh position={[0, size2 / 2, 0]} castShadow receiveShadow>
                            <cylinderGeometry args={[size1 * 0.05, size1 * 0.05, size2, 16]} />
                            <meshStandardMaterial
                                color="#8B4513"
                                metalness={mat.metalness}
                                roughness={mat.roughness}
                                clearcoat={mat.clearcoat}
                                clearcoatRoughness={mat.clearcoatRoughness}
                            />
                        </mesh>
                        <mesh
                            position={[size1 * 0.3, size2 - size1 * 0.3, 0]}
                            rotation={[Math.PI / 2, Math.PI / 2, 0]}
                            castShadow
                            receiveShadow
                        >
                            <cylinderGeometry args={[size1 * 0.6, size1 * 0.6, size1 * 0.12, 3]} />
                            <meshStandardMaterial
                                color="#FF0000"
                                metalness={mat.metalness}
                                roughness={mat.roughness}
                                clearcoat={mat.clearcoat}
                                clearcoatRoughness={mat.clearcoatRoughness}
                            />
                        </mesh>
                    </group>
                );
            case "2": {
                const starShape = new Shape();
                const outerRadius = size1 / 2;
                const innerRadius = outerRadius * 0.4;
                const points = 5;
                for (let i = 0; i < points * 2; i++) {
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    if (i === 0) {
                        starShape.moveTo(x, y);
                    } else {
                        starShape.lineTo(x, y);
                    }
                }
                starShape.closePath();

                const extrudeSettings = {
                    depth: size3,
                    bevelEnabled: true,
                    bevelThickness: size3 * 0.1,
                    bevelSize: size3 * 0.1,
                    bevelSegments: 2
                };

                const starGeometry = new ExtrudeGeometry(starShape, extrudeSettings);
                starGeometry.rotateX(-Math.PI / 2);
                starGeometry.translate(0, size3 / 2, 0);

                return (
                    <mesh
                        position={[pos.x, pos.y, pos.z]}
                        rotation={[rotRad.x, rotRad.y, rotRad.z]}
                        castShadow
                        receiveShadow
                    >
                        <primitive object={starGeometry} />
                        <meshStandardMaterial
                            color="#FFD700"
                            metalness={mat.metalness}
                            roughness={mat.roughness}
                            clearcoat={mat.clearcoat}
                            clearcoatRoughness={mat.clearcoatRoughness}
                        />
                    </mesh>
                );
            }
            case "3":
                return (
                    <mesh
                        position={[pos.x, pos.y, pos.z]}
                        rotation={[rotRad.x, rotRad.y, rotRad.z]}
                        castShadow
                        receiveShadow
                    >
                        <sphereGeometry args={[size1 / 2, 32, 32]} />
                        <meshStandardMaterial
                            color="#FFD700"
                            metalness={mat.metalness}
                            roughness={mat.roughness}
                            clearcoat={mat.clearcoat}
                            clearcoatRoughness={mat.clearcoatRoughness}
                        />
                    </mesh>
                );
            case "4":
                return (
                    <mesh
                        position={[pos.x, pos.y + size2 / 2, pos.z]}
                        rotation={[rotRad.x, rotRad.y, rotRad.z]}
                        castShadow
                        receiveShadow
                    >
                        <coneGeometry args={[size1 / 2, size2, 4]} />
                        <meshStandardMaterial
                            color="#FFD700"
                            metalness={mat.metalness}
                            roughness={mat.roughness}
                            clearcoat={mat.clearcoat}
                            clearcoatRoughness={mat.clearcoatRoughness}
                        />
                    </mesh>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <OrbitControls />

            {/* 基础环境光 */}
            <ambientLight intensity={0.5} />

            {/* 使用选中的 HDRI 贴图作为环境 */}
            <Environment files={hdrFile || '/stage.hdr'} background />

            {/* 主方向光 */}
            <directionalLight
                position={[50, 80, 50]}
                intensity={2}
                castShadow
            />

            {/* 加粗坐标轴 - 使用LineSegments，不会被导出 */}
            {createAxisLines(600, 3).map((axis, index) => (
                <primitive key={`axis-${index}`} object={axis} />
            ))}

            {/* XY平面网格 - 使用LineSegments绘制，不会被导出 */}
            <primitive object={createGridLines(500, 100)} position={[0, 0, 0]} />

            {/* 坐标轴标签 */}
            <Text position={[50, 0, 0]} fontSize={3} color="red" anchorX="left">X</Text>
            <Text position={[0, 50, 0]} fontSize={3} color="green" anchorX="center">Y</Text>
            <Text position={[0, 0, 50]} fontSize={3} color="blue" anchorX="left">Z</Text>

            {/* Model root group - contains only the chess model meshes */}
            <group ref={modelRootRef}>
                {/* 渲染底座（包括异形） */}
                {renderBaseShape()}

                {/* 渲染柱体（包括异形） */}
                {renderColumnShape()}

                {/* 渲染装饰 */}
                {hasDecoration && renderDecoration(decoration)}
            </group>
        </>
    );
}

function ModelRenderer({ chess, onModelReady, hdrFile }) {
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <Canvas
                camera={{ position: [40, 40, 40] }}
                shadows
                style={{
                    width: '100%',
                    height: '100%',
                    background: 'transparent',
                    display: 'block',
                    margin: 0,
                    padding: 0,
                    outline: 'none',
                    border: 'none'
                }}
                gl={{ alpha: true, premultipliedAlpha: false }}
            >
                <SceneContent chess={chess} onModelReady={onModelReady} hdrFile={hdrFile} />
            </Canvas>

            {/* 页面左下角比例尺标签 */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                backgroundColor: 'rgba(200, 200, 200, 0.6)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderRadius: '12px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                padding: '0 16px',
                minWidth: '120px',
                height: '50px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                fontFamily: 'sans-serif',
                zIndex: 10,
                pointerEvents: 'none'
            }}>
                <div style={{ fontWeight: '600', color: '#333', fontSize: '13px' }}>Scale</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                        width: '25px',
                        height: '2px',
                        backgroundColor: '#333',
                        position: 'relative',
                    }}>
                        <div style={{
                            position: 'absolute',
                            width: '2px',
                            height: '5px',
                            backgroundColor: '#333',
                            left: '0',
                            top: '-1.5px'
                        }} />
                        <div style={{
                            position: 'absolute',
                            width: '2px',
                            height: '5px',
                            backgroundColor: '#333',
                            right: '0',
                            top: '-1.5px'
                        }} />
                    </div>
                    <span style={{ color: '#333', fontSize: '12px', fontWeight: '500' }}>1 ： 5单位长度</span>
                </div>
            </div>
        </div>
    )
}

export default ModelRenderer;
