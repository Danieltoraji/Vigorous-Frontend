import React, { useEffect, useRef, useState, Suspense, useMemo } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Text, Environment, Text3D } from '@react-three/drei';
import * as THREE from 'three';
import { STLLoader } from 'three-stdlib';
import { OBJLoader } from 'three-stdlib';
import { ModelPreview } from '../../../Components/CustomRevolutionGenerator/CustomRevolutionGenerator.jsx';
import { useDecoration } from '../../../hooks/useDecoration.jsx';

const { AxesHelper, ExtrudeGeometry, Shape } = THREE;

const PRESET_DECORATION_IDS = ['0', '1', '2', '3', '4'];

// 基础几何图形 ID 列表
const BASIC_GEOMETRY_IDS = ['geo_sphere', 'geo_cube', 'geo_cylinder', 'geo_cone'];

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
function SceneContent({ chess, onModelReady, hdrFile, smoothTexture = false }) {
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
                                scale={[
                                    pattern.scaleX !== undefined ? pattern.scaleX : 1,
                                    pattern.scaleY !== undefined ? pattern.scaleY : -1,
                                    pattern.scaleZ !== undefined ? pattern.scaleZ : 1
                                ]}
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
                                scale={[
                                    pattern.scaleX !== undefined ? pattern.scaleX : 1,
                                    pattern.scaleY !== undefined ? pattern.scaleY : -1,
                                    pattern.scaleZ !== undefined ? pattern.scaleZ : 1
                                ]}
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
                                scale={[
                                    pattern.scaleX !== undefined ? pattern.scaleX : 1,
                                    pattern.scaleY !== undefined ? pattern.scaleY : -1,
                                    pattern.scaleZ !== undefined ? pattern.scaleZ : 1
                                ]}
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
                            scale={[
                                pattern.scaleX !== undefined ? pattern.scaleX : 1,
                                pattern.scaleY !== undefined ? pattern.scaleY : -1,
                                pattern.scaleZ !== undefined ? pattern.scaleZ : 1
                            ]}
                            castShadow
                            receiveShadow
                        >
                            <VoxelGeometry
                                textureFile={pattern.textureFile}
                                size={pattern.size || 10}
                                depth={pattern.depth || 1}
                                sampleRate={2} // 每 2 个像素采样一次，减少噪点影响
                                smooth={pattern.smooth ?? smoothTexture} // 优先使用 pattern 中保存的设置
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
                                scale={[
                                    pattern.scaleX !== undefined ? pattern.scaleX : 1,
                                    pattern.scaleY !== undefined ? pattern.scaleY : -1,
                                    pattern.scaleZ !== undefined ? pattern.scaleZ : 1
                                ]}
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
                                scale={[
                                    pattern.scaleX !== undefined ? pattern.scaleX : 1,
                                    pattern.scaleY !== undefined ? pattern.scaleY : -1,
                                    pattern.scaleZ !== undefined ? pattern.scaleZ : 1
                                ]}
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
                                scale={[
                                    pattern.scaleX !== undefined ? pattern.scaleX : 1,
                                    pattern.scaleY !== undefined ? pattern.scaleY : -1,
                                    pattern.scaleZ !== undefined ? pattern.scaleZ : 1
                                ]}
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
                            scale={[
                                pattern.scaleX !== undefined ? pattern.scaleX : 1,
                                pattern.scaleY !== undefined ? pattern.scaleY : -1,
                                pattern.scaleZ !== undefined ? pattern.scaleZ : 1
                            ]}
                            castShadow
                            receiveShadow
                        >
                            <VoxelGeometry
                                textureFile={pattern.textureFile}
                                size={pattern.size || 10}
                                depth={pattern.depth || 1}
                                sampleRate={2}
                                smooth={pattern.smooth ?? smoothTexture} // 优先使用 pattern 中保存的设置
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

function ModelRenderer({ chess, onModelReady, hdrFile, smoothTexture = false }) {
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
                <SceneContent chess={chess} onModelReady={onModelReady} hdrFile={hdrFile} smoothTexture={smoothTexture} />
            </Canvas>

            {/* 页面左下角比例尺标签 */}
            <div style={{
                position: 'absolute',
                bottom: '100px',
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
