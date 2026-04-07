import React, { useEffect, useRef, useState, Suspense, useMemo } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Text as DreiText, Environment, Text3D } from '@react-three/drei';
import * as THREE from 'three';
import { STLLoader } from 'three-stdlib';
import { OBJLoader } from 'three-stdlib';
import { ModelPreview } from '../../../Components/CustomRevolutionGenerator/CustomRevolutionGenerator.jsx';
import { useDecoration } from '../../../hooks/useDecoration.jsx';


const { AxesHelper, ExtrudeGeometry, Shape, TextureLoader, Float32BufferAttribute, MeshStandardMaterial, LineSegments, LineBasicMaterial, BufferGeometry, Vector2, Vector3, LatheGeometry } = THREE;
const DEFAULT_TEXT_FONT_JSON = '/static/fonts/STZhongsong_Regular.json';

const PRESET_DECORATION_IDS = ['0', '1', '2', '3', '4'];
const textureLoader = new TextureLoader();
// 基础几何图形 ID 列表
const BASIC_GEOMETRY_IDS = ['geo_sphere', 'geo_cube', 'geo_cylinder', 'geo_cone'];

function toRadians(value = 0) {
    return (value * Math.PI) / 180;
}

function toRotation(rotation = {}) {
    return [
        toRadians(rotation.x || 0),
        toRadians(rotation.y || 0),
        toRadians(rotation.z || 0)
    ];
}

function getPatternTransform(pattern = {}) {
    const scaleX = pattern.scaleX !== undefined ? pattern.scaleX : 1;
    const scaleY = pattern.scaleY !== undefined ? pattern.scaleY : -1;
    const scaleZ = pattern.scaleZ !== undefined ? pattern.scaleZ : 1;

    return [scaleX, scaleY, scaleZ];
}

function getPatternRotation(pattern = {}) {
    const rotationX = toRadians(pattern.rotationX || 0);
    const rotationY = toRadians(pattern.rotationY || 0);
    const rotationZ = toRadians(pattern.rotationZ || 0);

    return [rotationX, rotationY, rotationZ];
}

function PatternTextMesh({ pattern = {}, material, color = '#CD853F', position = [0, 0, 0], rotation = [-Math.PI / 2, 0, 0] }) {
    const transform = getPatternTransform(pattern);

    return (
        <group position={position} rotation={rotation} scale={transform}>
            <mesh castShadow receiveShadow>
                <Text3D
                    font={pattern.font || DEFAULT_TEXT_FONT_JSON}
                    size={pattern.size || 5}
                    height={pattern.depth || 1}
                    curveSegments={12}
                >
                    {(pattern.content ?? '').toString()}
                </Text3D>
                <meshStandardMaterial
                    color={color}
                    metalness={material?.metalness ?? 0.2}
                    roughness={material?.roughness ?? 0.6}
                    clearcoat={material?.clearcoat ?? 0}
                    clearcoatRoughness={material?.clearcoatRoughness ?? 0}
                />
            </mesh>
        </group>
    );
}

function VoxelGeometry({ textureFile, size = 10, depth = 1, sampleRate = 4, smooth = false }) {
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

                console.log('=== VoxelGeometry 纹理处理开始 ===', {
                    图片尺寸: `${image.width || image.naturalWidth}x${image.height || image.naturalHeight}`,
                    纹理文件URL: textureFile
                });

                const width = image.width;
                const height = image.height;
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0);

                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;

                // 调试：检查四个角落的alpha值和RGB值
                const corners = [
                    { name: '左上角', idx: 0 },
                    { name: '右上角', idx: (width - 1) * 4 },
                    { name: '左下角', idx: (height - 1) * width * 4 },
                    { name: '右下角', idx: (height - 1) * width * 4 + (width - 1) * 4 },
                    { name: '中心', idx: Math.floor(height / 2) * width * 4 + Math.floor(width / 2) * 4 }
                ];
                
                corners.forEach(corner => {
                    const i = corner.idx;
                    console.log(`${corner.name}:`, {
                        R: data[i],
                        G: data[i + 1],
                        B: data[i + 2],
                        A: data[i + 3],
                        alpha_normalized: (data[i + 3] / 255).toFixed(3),
                        will_be_zero: data[i + 3] < 13  // 0.05 * 255 = 12.75
                    });
                });

                // 存储所有体素点的高度值
                const heightMap = [];
                const step = sampleRate;

                // 先提取原始灰度数据到数组
                const rawGrayData = [];
                for (let y = 0; y < height; y += step) {
                    const row = [];
                    for (let x = 0; x < width; x += step) {
                        const idx = (y * width + x) * 4;
                        // 检查alpha通道，如果透明则标记为-1（不生成几何体）
                        const alpha = data[idx + 3] / 255;
                        if (alpha < 0.05) {
                            // 几乎完全透明区域，标记为无效
                            row.push(-1);
                        } else {
                            // 计算灰度值 (0-1)
                            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / (3 * 255);
                            row.push(gray);
                        }
                    }
                    rawGrayData.push(row);
                }

                // 根据 smooth 参数决定是否应用 3x3 均值滤波
                const grayDataToUse = smooth ? [] : rawGrayData;

                // 统计透明像素数量
                let transparentCount = 0;
                let totalCount = rawGrayData.length * (rawGrayData[0] ? rawGrayData[0].length : 0);
                rawGrayData.forEach(row => {
                    row.forEach(val => {
                        if (val === 0) transparentCount++;
                    });
                });
                console.log('透明像素统计:', {
                    总像素数: totalCount,
                    透明像素数: transparentCount,
                    透明比例: (transparentCount / totalCount * 100).toFixed(2) + '%',
                    smooth模式: smooth
                });

                if (smooth) {
                    // 应用 3x3 均值滤波消除噪点
                    let smoothedTransparentCount = 0;
                    for (let row = 0; row < rawGrayData.length; row++) {
                        const filteredRow = [];
                        for (let col = 0; col < rawGrayData[row].length; col++) {
                            let sum = 0;
                            let count = 0;

                            // 检查中心像素是否透明
                            const centerValue = rawGrayData[row][col];
                            const isTransparent = centerValue === 0;

                            // 取周围 3x3 邻域的平均值
                            for (let dy = -1; dy <= 1; dy++) {
                                for (let dx = -1; dx <= 1; dx++) {
                                    const newRow = row + dy;
                                    const newCol = col + dx;

                                    if (newRow >= 0 && newRow < rawGrayData.length &&
                                        newCol >= 0 && newCol < rawGrayData[row].length) {
                                        const neighborValue = rawGrayData[newRow][newCol];
                                        const neighborIsTransparent = neighborValue === 0;
                                        
                                        // 只平均相同透明状态的像素
                                        if (isTransparent === neighborIsTransparent) {
                                            sum += neighborValue;
                                            count++;
                                        }
                                    }
                                }
                            }

                            const filteredValue = count > 0 ? sum / count : centerValue;
                            filteredRow.push(filteredValue);
                            
                            if (filteredValue === 0) smoothedTransparentCount++;
                        }
                        grayDataToUse.push(filteredRow);
                    }
                    
                    console.log('Smooth后透明像素统计:', {
                        原始透明数: transparentCount,
                        Smooth后透明数: smoothedTransparentCount,
                        丢失的透明像素: transparentCount - smoothedTransparentCount
                    });
                }

                // 使用选定的灰度数据生成高度图
                let zeroHeightCount = 0;
                let invalidCount = 0;
                for (let row = 0; row < grayDataToUse.length; row++) {
                    for (let col = 0; col < grayDataToUse[row].length; col++) {
                        const gray = grayDataToUse[row][col];
                        
                        // 如果是无效像素（透明），标记为null
                        if (gray === -1) {
                            heightMap.push(null);
                            invalidCount++;
                        } else {
                            // 映射到高度（黑色=最高，白色=最低）
                            const h = (1 - gray) * depth;
                            if (h === 0) zeroHeightCount++;
                            heightMap.push({
                                x: col * step,
                                y: row * step,
                                height: h
                            });
                        }
                    }
                }

                console.log('高度图统计:', {
                    总点数: heightMap.length,
                    '无效点数(透明)': invalidCount,
                    无效比例: (invalidCount / heightMap.length * 100).toFixed(2) + '%',
                    高度为0的点数: zeroHeightCount
                });

                // 生成网格顶点和索引（只有顶面）
                const positions = [];
                const indices = [];

                const gridWidth = Math.floor(width / step);
                const gridHeight = Math.floor(height / step);
                const planeSize = size / Math.max(gridWidth, gridHeight);

                // 生成顶点（跳过无效顶点）
                for (let i = 0; i < heightMap.length; i++) {
                    const point = heightMap[i];
                    // 如果是无效顶点（透明），跳过
                    if (point === null) {
                        positions.push(0, -10000, 0);  // 放到极远处，不可见
                    } else {
                        // 直接生成在 XZ 平面，高度沿 Y 轴
                        const px = -(point.x - width / 2) * planeSize;
                        const py = point.height;
                        const pz = -(point.y - height / 2) * planeSize;
                        positions.push(px, py, pz);
                    }
                }

                // 生成三角形索引（连接相邻点），跳过包含透明顶点的三角形
                let skippedQuads = 0;
                let totalQuads = 0;
                for (let row = 0; row < gridHeight - 1; row++) {
                    for (let col = 0; col < gridWidth - 1; col++) {
                        const a = row * gridWidth + col;
                        const b = row * gridWidth + (col + 1);
                        const c = (row + 1) * gridWidth + col;
                        const d = (row + 1) * gridWidth + (col + 1);

                        totalQuads++;

                        // 检查四个顶点是否都有效（不是null）
                        const pA = heightMap[a];
                        const pB = heightMap[b];
                        const pC = heightMap[c];
                        const pD = heightMap[d];

                        // 只有当所有顶点都有效时才生成三角形
                        if (pA !== null && pB !== null && pC !== null && pD !== null) {
                            // 两个三角形组成一个四边形
                            // 三角形 1: a-b-c
                            indices.push(a, b, c);
                            // 三角形 2: b-d-c
                            indices.push(b, d, c);
                        } else {
                            skippedQuads++;
                        }
                    }
                }

                console.log('网格生成统计:', {
                    总四边形数: totalQuads,
                    跳过的四边形数: skippedQuads,
                    实际生成的三角形数: indices.length / 3,
                    跳过比例: (skippedQuads / totalQuads * 100).toFixed(2) + '%'
                });

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
    }, [textureFile, size, depth, sampleRate, smooth]);

    if (!geometry) return null;

    return <primitive object={geometry} />;
}

// 创建网格辅助线（LineSegments，不会被导出为模型网格）
function createGridLines(size = 200, divisions = 100) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];

    const step = size / divisions;
    const halfSize = size / 2;

    for (let i = 0; i <= divisions; i++) {
        const pos = -halfSize + i * step;

        // X 方向平行线
        positions.push(pos, 0, -halfSize);
        positions.push(pos, 0, halfSize);

        // Z 方向平行线
        positions.push(-halfSize, 0, pos);
        positions.push(halfSize, 0, pos);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    const material = new THREE.LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.5 });
    return new THREE.LineSegments(geometry, material);
}

// 创建 XYZ 坐标轴辅助线（LineSegments，不会被导出为模型网格）
function createAxisLines(length = 80, thickness = 2) {
    const axes = [];

    const xGeometry = new THREE.BufferGeometry();
    xGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, length, 0, 0]), 3));
    const xMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: thickness });
    axes.push(new THREE.LineSegments(xGeometry, xMaterial));

    const yGeometry = new THREE.BufferGeometry();
    yGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, length, 0]), 3));
    const yMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: thickness });
    axes.push(new THREE.LineSegments(yGeometry, yMaterial));

    const zGeometry = new THREE.BufferGeometry();
    zGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, 0, length]), 3));
    const zMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: thickness });
    axes.push(new THREE.LineSegments(zGeometry, zMaterial));

    return axes;
}
// 根据文件扩展名判断模型类型
function getModelType(url) {
    const extension = url.split('.').pop().toLowerCase();
    if (extension === 'stl') return 'stl';
    if (extension === 'obj') return 'obj';
    return null;
}

// STL 模型加载组件
function STLModel({ url, position, rotation, scale, material }) {
    const geometry = useLoader(STLLoader, url);

    const clonedGeometry = useMemo(() => {
        const geo = geometry.clone();
        // 居中几何体
        geo.computeBoundingBox();
        const center = new THREE.Vector3();
        geo.boundingBox.getCenter(center);
        geo.translate(-center.x, -center.y, -center.z);
        return geo;
    }, [geometry]);

    return (
        <mesh
            position={position}
            rotation={rotation}
            scale={scale}
            castShadow
            receiveShadow
        >
            <primitive object={clonedGeometry} />
            <meshStandardMaterial
                color={material?.color || '#FFD700'}
                metalness={material?.metalness || 0.5}
                roughness={material?.roughness || 0.3}
                clearcoat={material?.clearcoat || 0}
                clearcoatRoughness={material?.clearcoatRoughness || 0}
            />
        </mesh>
    );
}

// OBJ 模型加载组件
function OBJModel({ url, position, rotation, scale, material }) {
    const obj = useLoader(OBJLoader, url);

    const clonedObj = useMemo(() => {
        const cloned = obj.clone();
        cloned.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (material) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: material.color || '#FFD700',
                        metalness: material.metalness || 0.5,
                        roughness: material.roughness || 0.3,
                        clearcoat: material.clearcoat || 0,
                        clearcoatRoughness: material.clearcoatRoughness || 0
                    });
                }
            }
        });
        return cloned;
    }, [obj, material]);

    return (
        <primitive
            object={clonedObj}
            position={position}
            rotation={rotation}
            scale={scale}
        />
    );
}

// 统一的自定义装饰模型组件
function CustomDecorationModel({ url, position, rotation, scale, material }) {
    const modelType = getModelType(url);

    if (modelType === 'stl') {
        return (
            <STLModel
                url={url}
                position={position}
                rotation={rotation}
                scale={scale}
                material={material}
            />
        );
    }

    if (modelType === 'obj') {
        return (
            <OBJModel
                url={url}
                position={position}
                rotation={rotation}
                scale={scale}
                material={material}
            />
        );
    }

    // 不支持的格式返回占位符
    return (
        <mesh position={position} castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#FF0000" />
        </mesh>
    );
}

function FallbackDecoration({ position, size }) {
    return (
        <mesh position={position} castShadow receiveShadow>
            <boxGeometry args={[size || 2, size || 2, size || 2]} />
            <meshStandardMaterial color="#888888" metalness={0.3} roughness={0.5} />
        </mesh>
    );
}

/**
 * SceneContent component - contains all scene objects and model rendering logic
 * This component has access to the Three.js scene via useThree() hook
 */
function SceneContent({ chess, onModelReady, hdrFile, smoothTexture = false, showAxes = true, showGrid = true }) {
    const modelRootRef = useRef();
    const { decorationData, loading: decorationLoading } = useDecoration();

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
                <DreiText position={[0, 0, 0]} fontSize={1} color="red">
                    Invalid chess data
                </DreiText>
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

    // 根据形状类型生成 Shape 轮廓（支持圆形、多边形、正方形）
    const generateShapeOutline = (geoType, size1, size2, sides = 0) => {
        const shape = new Shape();
        const radius = geoType === 'cylinder' ? Math.max(size1, size2) : Math.max(size1, size2) / 2;

        if (geoType === 'box') {
            // 正方形轮廓
            const halfWidth = size1 / 2;
            const halfDepth = size2 / 2;
            shape.moveTo(-halfWidth, -halfDepth);
            shape.lineTo(halfWidth, -halfDepth);
            shape.lineTo(halfWidth, halfDepth);
            shape.lineTo(-halfWidth, halfDepth);
            shape.lineTo(-halfWidth, -halfDepth);
        } else if (geoType === 'cylinder' && sides >= 3) {
            // 多边形轮廓
            const angleStep = (Math.PI * 2) / sides;
            for (let i = 0; i < sides; i++) {
                const angle = i * angleStep;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                if (i === 0) {
                    shape.moveTo(x, y);
                } else {
                    shape.lineTo(x, y);
                }
            }
            shape.lineTo(Math.cos(0) * radius, Math.sin(0) * radius);
        } else {
            // 默认圆形轮廓
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
        }
        shape.closePath();
        return shape;
    };

    // 为台体（上下半径不一致）生成可倒角的圆滑几何体
    const createRoundedFrustumGeometry = (radiusTop, radiusBottom, height, bevelSize, radialSegments, bevelSegments) => {
        const safeTop = Math.max(radiusTop || 0, 0.001);
        const safeBottom = Math.max(radiusBottom || 0, 0.001);
        const halfHeight = Math.max(height || 0, 0.001) / 2;
        const maxBevel = Math.min(
            bevelSize || 0,
            halfHeight - 0.001,
            safeTop * 0.45,
            safeBottom * 0.45
        );

        if (maxBevel <= 0.0001) {
            return new THREE.CylinderGeometry(safeTop, safeBottom, Math.max(height || 0, 0.001), radialSegments);
        }

        const topFlat = Math.max(safeTop - maxBevel, 0.001);
        const bottomFlat = Math.max(safeBottom - maxBevel, 0.001);
        const yTop = halfHeight;
        const yBottom = -halfHeight;
        const bSeg = Math.max(2, bevelSegments || 4);
        const bodySeg = 24;
        const points = [];

        // 顶面中心到顶面边
        points.push(new Vector2(0, yTop));
        points.push(new Vector2(topFlat, yTop));

        // 顶部圆角过渡（顶面 -> 侧面）
        for (let i = 1; i <= bSeg; i++) {
            const t = i / bSeg;
            const theta = t * Math.PI * 0.5;
            const r = topFlat + (safeTop - topFlat) * Math.sin(theta);
            const y = yTop - maxBevel * (1 - Math.cos(theta));
            points.push(new Vector2(r, y));
        }

        // 侧面（台体斜面）
        for (let i = 1; i <= bodySeg; i++) {
            const t = i / bodySeg;
            const yStart = yTop - maxBevel;
            const yEnd = yBottom + maxBevel;
            const y = yStart + (yEnd - yStart) * t;
            const r = safeTop + (safeBottom - safeTop) * t;
            points.push(new Vector2(r, y));
        }

        // 底部圆角过渡（侧面 -> 底面）
        for (let i = 1; i <= bSeg; i++) {
            const t = i / bSeg;
            const theta = t * Math.PI * 0.5;
            const r = safeBottom - (safeBottom - bottomFlat) * Math.sin(theta);
            const y = yBottom + maxBevel * Math.cos(theta);
            points.push(new Vector2(r, y));
        }

        // 底面边到底面中心
        points.push(new Vector2(bottomFlat, yBottom));
        points.push(new Vector2(0, yBottom));

        const geometry = new LatheGeometry(points.reverse(), Math.max(16, radialSegments || 64));
        geometry.computeVertexNormals();
        return geometry;
    };

    // 为多棱柱台体（上下半径不一致）生成可倒角的圆滑几何体
    const createRoundedPolygonFrustumGeometry = (radiusTop, radiusBottom, height, sides, bevelSize, bevelSegments) => {
        const safeTop = Math.max(radiusTop || 0, 0.001);
        const safeBottom = Math.max(radiusBottom || 0, 0.001);
        const safeHeight = Math.max(height || 0, 0.001);
        const safeSides = Math.max(3, sides || 6);
        const baseRadius = Math.max(safeTop, safeBottom, 0.001);
        const maxBevel = Math.min(bevelSize || 0, safeHeight * 0.45, baseRadius * 0.35);

        const shape = generateShapeOutline('cylinder', baseRadius, baseRadius, safeSides);
        const extrudeSettings = {
            depth: safeHeight,
            bevelEnabled: maxBevel > 0.0001,
            bevelThickness: maxBevel,
            bevelSize: maxBevel,
            bevelSegments: Math.max(2, bevelSegments || 4),
            curveSegments: 8,
            steps: 1
        };

        const geometry = new ExtrudeGeometry(shape, extrudeSettings);
        geometry.rotateX(Math.PI / 2);
        geometry.translate(0, safeHeight / 2, 0);

        // 按 y 位置将截面半径从底部线性过渡到顶部，形成多棱柱台体
        const position = geometry.attributes.position;
        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            const z = position.getZ(i);
            const t = Math.max(0, Math.min(1, y / safeHeight));
            const targetRadius = safeBottom + (safeTop - safeBottom) * t;
            const scale = targetRadius / baseRadius;
            position.setXYZ(i, x * scale, y, z * scale);
        }

        position.needsUpdate = true;
        geometry.computeVertexNormals();
        return geometry;
    };

    // 渲染底座组件（带边缘处理）
    const renderBaseShape = () => {
        if (!hasBase) return null;

        const { type, size1, size2, height } = baseShape;
        const position = base.position || { x: 0, y: 0, z: 0 };
        const rotation = baseShape.rotation || { x: 0, y: 0, z: 0 };
        const specialScale = baseShape.specialScale || { x: 1, y: 1, z: 1 };
        const specialRotation = baseShape.specialRotation || { x: 0, y: 0, z: 0 };
        const material = base.material || { metalness: 0.3, roughness: 0.4, clearcoat: 0, clearcoatRoughness: 0 };
        const pattern = base.pattern || { shape: 'none', position: { x: 0, y: 0, z: 0 } };
        const patternScale = getPatternTransform(pattern);
        const edge = base.edge || { type: 'none', depth: 0, segments: 4 };

        // 渲染主体元素 
        let bodyelement = null;

        // 根据边缘处理类型创建几何体
        const createGeometry = (geoType, args, sides = 0) => {
            if (edge.type === 'none' || !edge.depth || edge.depth === 0) {
                // 无边缘处理，直接创建标准几何体
                if (geoType === 'cylinder') {
                    return <cylinderGeometry args={args} />;
                } else if (geoType === 'box') {
                    return <boxGeometry args={args} />;
                }
            } else {
                const isFrustum = geoType === 'cylinder' && Math.abs((size1 || 0) - (size2 || 0)) > 0.0001;

                if (isFrustum && edge.type === 'smooth' && sides < 3) {
                    const geometry = createRoundedFrustumGeometry(
                        size1,
                        size2,
                        height,
                        edge.depth || 0.1,
                        Math.max(48, (edge.segments || 4) * 16),
                        Math.max(4, edge.segments || 4)
                    );
                    return <primitive object={geometry} />;
                }

                if (isFrustum && edge.type === 'round' && sides < 3) {
                    const geometry = createRoundedFrustumGeometry(
                        size1,
                        size2,
                        height,
                        edge.depth || 0.1,
                        256,
                        24
                    );
                    return <primitive object={geometry} />;
                }

                if (isFrustum && sides >= 3 && (edge.type === 'smooth' || edge.type === 'round')) {
                    const geometry = createRoundedPolygonFrustumGeometry(
                        size1,
                        size2,
                        height,
                        sides,
                        edge.depth || 0.1,
                        edge.type === 'round' ? 32 : Math.max(4, edge.segments || 4)
                    );
                    return <primitive object={geometry} />;
                }

                // 有边缘处理，使用 ExtrudeGeometry 实现倒角效果
                const shape = generateShapeOutline(geoType, size1, size2, sides);

                if (edge.type === 'smooth' || edge.type === 'round') {
                    const bevelSegments = edge.type === 'smooth' ? (edge.segments || 4) : 256;
                    const bevelSize = edge.depth || 0.1;

                    const extrudeSettings = {
                        depth: height,
                        bevelEnabled: true,
                        bevelThickness: bevelSize,
                        bevelSize: bevelSize,
                        bevelSegments: bevelSegments,
                        curveSegments: 16
                    };

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
                    <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
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
                    <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
                        {createGeometry('cylinder', [size1, size2, height, baseSides], baseSides)}
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
                    <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
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
                    <group position={[0, 0, 0]}>
                        <ModelPreview
                            profilePoints={baseCustomShape.profilePoints}
                            pathPoints={baseCustomShape.pathPoints}
                            triggerSignal={baseCustomShape.generated ? 1 : 0}
                        />
                    </group>
                ); break;
            default:
                bodyelement = (
                    <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
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
                const textRotation = getPatternRotation(pattern);
                patternelement = (
                    <group
                        position={[pattern.position?.x || 0, position.y + height + (pattern.position?.y || 0) + 0.02, pattern.position?.z || 0]}
                        rotation={textRotation}
                    >
                        <PatternTextMesh
                            pattern={pattern}
                            material={material}
                            color="#CD853F"
                        />
                    </group>
                );
                break;
            case 'geometry':
                const geometryRotation = getPatternRotation(pattern);
                switch (pattern.geometryType) {
                    case 'Circle':
                        patternelement = (
                            <group
                                position={[pattern.position?.x || 0, position.y + height + pattern.depth / 2 + (pattern.position?.y || 0), pattern.position?.z || 0]}
                                rotation={geometryRotation}
                            >
                                <mesh
                                    scale={patternScale}
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
                            </group>
                        )
                        break;
                    case 'Polygon':
                        patternelement = (
                            <group
                                position={[pattern.position?.x || 0, position.y + height + pattern.depth / 2 + (pattern.position?.y || 0), pattern.position?.z || 0]}
                                rotation={geometryRotation}
                            >
                                <mesh
                                    scale={patternScale}
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
                            </group>
                        )
                        break;
                    case 'Cube':
                        patternelement = (
                            <group
                                position={[pattern.position?.x || 0, position.y + height + pattern.depth / 2, pattern.position?.z || 0]}
                                rotation={geometryRotation}
                            >
                                <mesh
                                    scale={patternScale}
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
                    const patternRotation = getPatternRotation(pattern);
                    patternelement = (
                        <group
                            position={[pattern.position?.x || 0, position.y + height + pattern.depth / 2 + (pattern.position?.y || 0), pattern.position?.z || 0]}
                            rotation={patternRotation}
                        >
                            <mesh
                                scale={patternScale}
                                castShadow
                                receiveShadow
                            >
                                <VoxelGeometry
                                    textureFile={pattern.textureFile}
                                    size={pattern.size || 10}
                                    depth={pattern.depth || 1}
                                    sampleRate={2}
                                    smooth={pattern.smooth ?? smoothTexture}
                                />
                                <meshStandardMaterial
                                    color="#CD853F"
                                    metalness={material.metalness}
                                    roughness={material.roughness}
                                    clearcoat={material.clearcoat}
                                    clearcoatRoughness={material.clearcoatRoughness}
                                />
                            </mesh>
                        </group>
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
            <group position={[position.x, position.y, position.z]} rotation={type === 'special' ? toRotation(specialRotation) : toRotation(rotation)} scale={type === 'special' ? [specialScale.x || 1, specialScale.y || 1, specialScale.z || 1] : [1, 1, 1]}>
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
        const rotation = columnShape.rotation || { x: 0, y: 0, z: 0 };
        const specialScale = columnShape.specialScale || { x: 1, y: 1, z: 1 };
        const specialRotation = columnShape.specialRotation || { x: 0, y: 0, z: 0 };
        const material = column.material || { metalness: 0.3, roughness: 0.4, clearcoat: 0, clearcoatRoughness: 0 };
        const pattern = column.pattern || { shape: 'none' };
        const patternScale = getPatternTransform(pattern);
        const edge = column.edge || { type: 'none', depth: 0, segments: 4 };
        const baseheight = base.shape.height || 0;
        let bodyelement = null;

        // 根据边缘处理类型创建几何体
        const createGeometry = (geoType, args, sides = 0) => {
            if (edge.type === 'none' || !edge.depth || edge.depth === 0) {
                // 无边缘处理，直接创建标准几何体
                if (geoType === 'cylinder') {
                    return <cylinderGeometry args={args} />;
                } else if (geoType === 'box') {
                    return <boxGeometry args={args} />;
                }
            } else {
                const isFrustum = geoType === 'cylinder' && Math.abs((size1 || 0) - (size2 || 0)) > 0.0001;

                if (isFrustum && edge.type === 'smooth' && sides < 3) {
                    const geometry = createRoundedFrustumGeometry(
                        size1,
                        size2,
                        height,
                        edge.depth || 0.1,
                        Math.max(48, (edge.segments || 4) * 16),
                        Math.max(4, edge.segments || 4)
                    );
                    return <primitive object={geometry} />;
                }

                if (isFrustum && edge.type === 'round' && sides < 3) {
                    const geometry = createRoundedFrustumGeometry(
                        size1,
                        size2,
                        height,
                        edge.depth || 0.1,
                        256,
                        24
                    );
                    return <primitive object={geometry} />;
                }

                if (isFrustum && sides >= 3 && (edge.type === 'smooth' || edge.type === 'round')) {
                    const geometry = createRoundedPolygonFrustumGeometry(
                        size1,
                        size2,
                        height,
                        sides,
                        edge.depth || 0.1,
                        edge.type === 'round' ? 32 : Math.max(4, edge.segments || 4)
                    );
                    return <primitive object={geometry} />;
                }

                // 有边缘处理，使用 ExtrudeGeometry 实现倒角效果
                const shape = generateShapeOutline(geoType, size1, size2, sides);

                if (edge.type === 'smooth' || edge.type === 'round') {
                    const bevelSegments = edge.type === 'smooth' ? (edge.segments || 4) : 256;
                    const bevelSize = edge.depth || 0.1;

                    const extrudeSettings = {
                        depth: height,
                        bevelEnabled: true,
                        bevelThickness: bevelSize,
                        bevelSize: bevelSize,
                        bevelSegments: bevelSegments,
                        curveSegments: 16
                    };

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
                    <mesh position={[0, baseheight + height / 2, 0]} castShadow receiveShadow>
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
                    <mesh position={[0, baseheight + height / 2, 0]} castShadow receiveShadow>
                        {createGeometry('cylinder', [size1, size2, height, columnSides], columnSides)}
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
                    <mesh position={[0, baseheight + height / 2, 0]} castShadow receiveShadow>
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
                    <group position={[0, baseheight + height / 2, 0]}>
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
                const textRotation = getPatternRotation(pattern);
                patternelement = (
                    <group
                        position={[pattern.position?.x || 0, baseheight + height + position.y + (pattern.position?.y || 0) + 0.02, pattern.position?.z || 0]}
                        rotation={textRotation}
                    >
                        <PatternTextMesh
                            pattern={pattern}
                            material={material}
                            color="#CD853F"
                        />
                    </group>
                );
                break;
            case 'geometry':
                const geometryRotation = getPatternRotation(pattern);
                switch (pattern.geometryType) {
                    case 'Circle':
                        patternelement = (
                            <group
                                position={[pattern.position?.x || 0, patternheight, pattern.position?.z || 0]}
                                rotation={geometryRotation}
                            >
                                <mesh
                                    scale={patternScale}
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
                            </group>
                        )
                        break;
                    case 'Polygon':
                        patternelement = (
                            <group
                                position={[pattern.position?.x || 0, patternheight, pattern.position?.z || 0]}
                                rotation={geometryRotation}
                            >
                                <mesh
                                    scale={patternScale}
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
                            </group>
                        )
                        break;
                    case 'Cube':
                        patternelement = (
                            <group
                                position={[pattern.position?.x || 0, patternheight, pattern.position?.z || 0]}
                                rotation={geometryRotation}
                            >
                                <mesh
                                    scale={patternScale}
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
                    const patternRotation = getPatternRotation(pattern);
                    patternelement = (
                        <group
                            position={[pattern.position?.x || 0, patternheight, pattern.position?.z || 0]}
                            rotation={patternRotation}
                        >
                            <mesh
                                scale={patternScale}
                                castShadow
                                receiveShadow
                            >
                                <VoxelGeometry
                                    textureFile={pattern.textureFile}
                                    size={pattern.size || 10}
                                    depth={pattern.depth || 1}
                                    sampleRate={2}
                                    smooth={pattern.smooth ?? smoothTexture}
                                />
                                <meshStandardMaterial
                                    color="#CD853F"
                                    metalness={material.metalness}
                                    roughness={material.roughness}
                                    clearcoat={material.clearcoat}
                                    clearcoatRoughness={material.clearcoatRoughness}
                                />
                            </mesh>
                        </group>
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
            <group position={[position.x, position.y, position.z]} rotation={type === 'special' ? toRotation(specialRotation) : toRotation(rotation)} scale={type === 'special' ? [specialScale.x || 1, specialScale.y || 1, specialScale.z || 1] : [1, 1, 1]}>
                {bodyelement}
                {patternelement}
            </group>
        );
    };
    // 渲染装饰组件
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

        // 预设装饰的基准尺寸
        const BASE_SIZE = 5;

        // 计算实际缩放：缩放因子 × 基准尺寸
        const scaleX = size1 * BASE_SIZE;
        const scaleY = size2 * BASE_SIZE;
        const scaleZ = size3 * BASE_SIZE;

        if (PRESET_DECORATION_IDS.includes(modelId)) {  //预设的装饰列表
            switch (modelId) {
                case "0":
                    return null;
                case "1": // 旗子
                    // scaleX: 旗杆和旗面的水平尺寸
                    // scaleY: 旗杆高度
                    // scaleZ: 旗面厚度
                    return (
                        <group
                            position={[pos.x, pos.y, pos.z]}
                            rotation={[rotRad.x, rotRad.y, rotRad.z]}
                        >
                            {/* 旗杆 */}
                            <mesh position={[0, scaleY / 2, 0]} castShadow receiveShadow>
                                <cylinderGeometry args={[scaleX * 0.05, scaleX * 0.05, scaleY, 16]} />
                                <meshStandardMaterial
                                    color="#8B4513"
                                    metalness={mat.metalness}
                                    roughness={mat.roughness}
                                    clearcoat={mat.clearcoat}
                                    clearcoatRoughness={mat.clearcoatRoughness}
                                />
                            </mesh>
                            {/* 旗面 */}
                            <mesh
                                position={[scaleX * 0.3, scaleY - scaleX * 0.3, 0]}
                                rotation={[Math.PI / 2, Math.PI / 2, 0]}
                                castShadow
                                receiveShadow
                            >
                                <cylinderGeometry args={[scaleX * 0.6, scaleX * 0.6, scaleZ * 0.5, 3]} />
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
                case "2": { // 五角星
                    // scaleX: 星星外半径
                    // scaleY: 星星厚度
                    // scaleZ: 同scaleY（用于挤出深度）
                    const starShape = new Shape();
                    const outerRadius = scaleX / 2;
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
                        depth: scaleY,
                        bevelEnabled: true,
                        bevelThickness: scaleY * 0.1,
                        bevelSize: scaleY * 0.1,
                        bevelSegments: 2
                    };

                    const starGeometry = new ExtrudeGeometry(starShape, extrudeSettings);
                    starGeometry.rotateX(-Math.PI / 2);
                    starGeometry.translate(0, scaleY / 2, 0);

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
                case "3": // 球体
                    // scaleX/Y/Z: 用于非均匀缩放球体
                    return (
                        <mesh
                            position={[pos.x, pos.y, pos.z]}
                            rotation={[rotRad.x, rotRad.y, rotRad.z]}
                            scale={[size1, size2, size3]}
                            castShadow
                            receiveShadow
                        >
                            <sphereGeometry args={[BASE_SIZE / 2, 32, 32]} />
                            <meshStandardMaterial
                                color="#FFD700"
                                metalness={mat.metalness}
                                roughness={mat.roughness}
                                clearcoat={mat.clearcoat}
                                clearcoatRoughness={mat.clearcoatRoughness}
                            />
                        </mesh>
                    );
                case "4": // 四棱锥
                    // scaleX: 底面尺寸
                    // scaleY: 高度
                    // scaleZ: 同scaleX（底面尺寸）
                    return (
                        <mesh
                            position={[pos.x, pos.y + scaleY / 2, pos.z]}
                            rotation={[rotRad.x, rotRad.y, rotRad.z]}
                            castShadow
                            receiveShadow
                        >
                            <coneGeometry args={[scaleX / 2, scaleY, 4]} />
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
        }

        // 渲染基础几何图形
        if (BASIC_GEOMETRY_IDS.includes(modelId)) {
            return renderBasicGeometry(modelId, size1, size2, size3, pos, rotRad, mat);
        }

        // 渲染自定义模型（STL/OBJ）
        if (!PRESET_DECORATION_IDS.includes(modelId) && !BASIC_GEOMETRY_IDS.includes(modelId) && modelId !== '0') {
            return renderCustomModel(modelId, size1, size2, size3, pos, rotRad, mat);
        }

        return null;
    };

    // 渲染基础几何图形
    const renderBasicGeometry = (modelId, size1, size2, size3, pos, rotRad, mat) => {
        const BASE_SIZE = 5;
        const scaleX = size1 * BASE_SIZE;
        const scaleY = size2 * BASE_SIZE;
        const scaleZ = size3 * BASE_SIZE;

        switch (modelId) {
            case 'geo_sphere':
                return (
                    <mesh
                        position={[pos.x, pos.y, pos.z]}
                        rotation={[rotRad.x, rotRad.y, rotRad.z]}
                        scale={[size1, size2, size3]}
                        castShadow
                        receiveShadow
                    >
                        <sphereGeometry args={[BASE_SIZE / 2, 32, 32]} />
                        <meshStandardMaterial
                            color="#FFD700"
                            metalness={mat.metalness}
                            roughness={mat.roughness}
                            clearcoat={mat.clearcoat}
                            clearcoatRoughness={mat.clearcoatRoughness}
                        />
                    </mesh>
                );
            case 'geo_cube':
                return (
                    <mesh
                        position={[pos.x, pos.y, pos.z]}
                        rotation={[rotRad.x, rotRad.y, rotRad.z]}
                        scale={[size1, size2, size3]}
                        castShadow
                        receiveShadow
                    >
                        <boxGeometry args={[BASE_SIZE, BASE_SIZE, BASE_SIZE]} />
                        <meshStandardMaterial
                            color="#C0C0C0"
                            metalness={mat.metalness}
                            roughness={mat.roughness}
                            clearcoat={mat.clearcoat}
                            clearcoatRoughness={mat.clearcoatRoughness}
                        />
                    </mesh>
                );
            case 'geo_cylinder':
                return (
                    <mesh
                        position={[pos.x, pos.y, pos.z]}
                        rotation={[rotRad.x, rotRad.y, rotRad.z]}
                        scale={[size1, size2, size3]}
                        castShadow
                        receiveShadow
                    >
                        <cylinderGeometry args={[BASE_SIZE / 2, BASE_SIZE / 2, BASE_SIZE, 32]} />
                        <meshStandardMaterial
                            color="#CD853F"
                            metalness={mat.metalness}
                            roughness={mat.roughness}
                            clearcoat={mat.clearcoat}
                            clearcoatRoughness={mat.clearcoatRoughness}
                        />
                    </mesh>
                );
            case 'geo_cone':
                return (
                    <mesh
                        position={[pos.x, pos.y + scaleY / 2, pos.z]}
                        rotation={[rotRad.x, rotRad.y, rotRad.z]}
                        castShadow
                        receiveShadow
                    >
                        <coneGeometry args={[scaleX / 2, scaleY, 32]} />
                        <meshStandardMaterial
                            color="#B8860B"
                            metalness={mat.metalness}
                            roughness={mat.roughness}
                            clearcoat={mat.clearcoat}
                            clearcoatRoughness={mat.clearcoatRoughness}
                        />
                    </mesh>
                );
            default:
                return <FallbackDecoration position={[pos.x, pos.y, pos.z]} size={size1} />;
        }
    };

    // 渲染自定义模型（STL/OBJ 文件）
    const renderCustomModel = (modelId, size1, size2, size3, pos, rotRad, mat) => {
        const customDecoration = decorationData?.[modelId];

        if (!customDecoration) {
            if (decorationLoading) {
                return null;
            }
            return <FallbackDecoration position={[pos.x, pos.y, pos.z]} size={size1} />;
        }

        // 检查文件字段（后端使用 'file' 字段存储模型文件）
        const modelUrl = customDecoration.file || customDecoration.modelUrl || customDecoration.model_url;

        if (modelUrl) {
            // size1/size2/size3 分别控制 x/y/z 方向的缩放
            // 默认值为 1（100%），用户可以通过尺寸调整缩放比例
            const scaleX = size1 || 1;
            const scaleY = size2 || 1;
            const scaleZ = size3 || 1;

            return (
                <Suspense fallback={<FallbackDecoration position={[pos.x, pos.y, pos.z]} size={size1} />}>
                    <CustomDecorationModel
                        url={modelUrl}
                        position={[pos.x, pos.y, pos.z]}
                        rotation={[rotRad.x, rotRad.y, rotRad.z]}
                        scale={[scaleX, scaleY, scaleZ]}
                        material={mat}
                    />
                </Suspense>
            );
        }

        return <FallbackDecoration position={[pos.x, pos.y, pos.z]} size={size1} />;
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
            {showAxes && createAxisLines(600, 3).map((axis, index) => (
                <primitive key={`axis-${index}`} object={axis} />
            ))}

            {/* XY平面网格 - 使用LineSegments绘制，不会被导出 */}
            {showGrid && <primitive object={createGridLines(500, 100)} position={[0, 0, 0]} />}

            {/* 坐标轴标签 */}
            <DreiText position={[50, 0, 0]} fontSize={3} color="red" anchorX="left">X</DreiText>
            <DreiText position={[0, 50, 0]} fontSize={3} color="green" anchorX="center">Y</DreiText>
            <DreiText position={[0, 0, 50]} fontSize={3} color="blue" anchorX="left">Z</DreiText>

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

function ModelRenderer({ chess, onModelReady, hdrFile, smoothTexture = false }) {
    const [showAxes, setShowAxes] = useState(true);
    const [showGrid, setShowGrid] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const hoverTimerRef = useRef(null);

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
                <SceneContent chess={chess} onModelReady={onModelReady} hdrFile={hdrFile} smoothTexture={smoothTexture} showAxes={showAxes} showGrid={showGrid} />
            </Canvas>

            {/* 页面左下角比例尺标签 */}
            <div 
                style={{
                    position: 'absolute',
                    bottom: '80px',
                    left: '20px',
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}
            >
                {/* 悬浮弹出的模态框 */}
                <div style={{
                    marginBottom: '12px',
                    display: 'flex',
                    gap: '10px',
                    opacity: isHovered ? 1 : 0,
                    transform: isHovered ? 'translateY(0)' : 'translateY(10px)',
                    transition: 'all 0.3s ease',
                    pointerEvents: isHovered ? 'auto' : 'none'
                }}
                    onMouseEnter={() => {
                        // 鼠标进入模态框，取消隐藏定时器
                        clearTimeout(hoverTimerRef.current);
                    }}
                    onMouseLeave={() => {
                        // 鼠标离开模态框，延迟隐藏
                        hoverTimerRef.current = setTimeout(() => {
                            setIsHovered(false);
                        }, 300);
                    }}
                >
                    {/* 坐标轴开关 */}
                    <div style={{
                        backgroundColor: 'rgba(200, 200, 200, 0.8)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        borderRadius: '8px',
                        border: '2px solid rgba(255, 255, 255, 0.4)',
                        padding: '6px 9px',
                        width: '68px',
                        height: '68px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                        cursor: 'pointer'
                    }} onClick={() => setShowAxes(!showAxes)}>
                        <div style={{ fontWeight: '600', color: '#333', fontSize: '11px' }}>坐标轴</div>
                        <div style={{
                            width: '32px',
                            height: '16px',
                            backgroundColor: showAxes ? 'rgba(14, 95, 115, 1)' : '#ccc',
                            borderRadius: '8px',
                            position: 'relative',
                            transition: 'background-color 0.3s ease'
                        }}>
                            <div style={{
                                position: 'absolute',
                                width: '12px',
                                height: '12px',
                                backgroundColor: 'white',
                                borderRadius: '50%',
                                top: '2px',
                                left: showAxes ? '18px' : '2px',
                                transition: 'left 0.3s ease',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                            }} />
                        </div>
                    </div>

                    {/* 网格开关 */}
                    <div style={{
                        backgroundColor: 'rgba(200, 200, 200, 0.8)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        borderRadius: '8px',
                        border: '2px solid rgba(255, 255, 255, 0.4)',
                        padding: '6px 9px',
                        width: '68px',
                        height: '68px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                        cursor: 'pointer'
                    }} onClick={() => setShowGrid(!showGrid)}>
                        <div style={{ fontWeight: '600', color: '#333', fontSize: '11px' }}>网格</div>
                        <div style={{
                            width: '32px',
                            height: '16px',
                            backgroundColor: showGrid ? 'rgba(14, 95, 115, 1)' : '#ccc',
                            borderRadius: '8px',
                            position: 'relative',
                            transition: 'background-color 0.3s ease'
                        }}>
                            <div style={{
                                position: 'absolute',
                                width: '12px',
                                height: '12px',
                                backgroundColor: 'white',
                                borderRadius: '50%',
                                top: '2px',
                                left: showGrid ? '18px' : '2px',
                                transition: 'left 0.3s ease',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                            }} />
                        </div>
                    </div>
                </div>

                {/* Scale指示器 */}
                <div 
                    className="scale-label"
                    style={{
                        position: 'relative',
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
                        cursor: 'pointer'
                    }}
                    onMouseEnter={() => {
                        // 鼠标进入Scale，取消隐藏定时器并显示模态框
                        clearTimeout(hoverTimerRef.current);
                        setIsHovered(true);
                    }}
                    onMouseLeave={() => {
                        // 鼠标离开Scale，延迟隐藏以给用户时间移动到模态框
                        hoverTimerRef.current = setTimeout(() => {
                            setIsHovered(false);
                        }, 100);
                    }}
                >
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
        </div>
    )
}

export default ModelRenderer;
