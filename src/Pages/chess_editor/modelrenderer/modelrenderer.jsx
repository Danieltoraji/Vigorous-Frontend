import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Environment, Text3D } from '@react-three/drei';
import * as THREE from 'three';
import { ModelPreview } from '../../../Components/CustomRevolutionGenerator/CustomRevolutionGenerator.jsx';

// 从 THREE 命名空间获取常用几何体和工具
const { AxesHelper, BoxGeometry, CylinderGeometry, ExtrudeGeometry, BufferGeometry, Vector3, MathUtils, Shape } = THREE;

/**
 * 创建圆角圆柱几何体 - 正确使用 Extrude + bevel
 * @param {number} radius - 半径
 * @param {number} height - 高度
 * @param {number} radialSegments - 径向分段数
 * @param {string} edgeType - 边缘类型：'none' | 'bevel' | 'smooth'
 * @param {number} edgeDepth - 边缘深度
 * @param {number} edgeSegments - 边缘分段数
 * @returns {BufferGeometry}
 */
function createRoundedCylinderGeometry(radius, height, radialSegments = 32, edgeType = 'none', edgeDepth = 0, edgeSegments = 4) {
    if (edgeType === 'none' || edgeDepth <= 0) {
        return new CylinderGeometry(radius, radius, height, radialSegments);
    }

    const safeDepth = Math.min(edgeDepth, height / 4, radius / 2);

    // 创建圆形形状（在 XY 平面）
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
        bevelSegments: edgeSegments, // 使用传入的边缘分段数
        curveSegments: segments
    };

    const geometry = new ExtrudeGeometry(shape, extrudeSettings);
    // Extrude 沿 Z 轴挤压（从 z=0 到 z=height）
    // 旋转 90 度后，沿 Y 轴从 y=0 到 y=-height（反向旋转）
    geometry.rotateX(-Math.PI / 2);
    return geometry;
}

/**
 * 创建圆角立方体几何体 - 使用 Extrude + bevel 实现真正的倒角
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @param {number} depth - 深度
 * @param {string} edgeType - 边缘类型：'none' | 'bevel' | 'smooth'
 * @param {number} edgeDepth - 边缘深度
 * @param {number} edgeSegments - 边缘分段数
 * @returns {BufferGeometry}
 */
function createRoundedBoxGeometry(width, height, depth, edgeType = 'none', edgeDepth = 0, edgeSegments = 4) {
    if (edgeType === 'none' || edgeDepth <= 0) {
        return new BoxGeometry(width, height, depth, 1, 1, 1);
    }

    const minSize = Math.min(width, height, depth);
    const safeDepth = Math.min(edgeDepth, minSize / 4);

    // 创建矩形形状（在 XY 平面）
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
        bevelSegments: edgeSegments, // 使用传入的边缘分段数
        curveSegments: 1
    };

    const geometry = new ExtrudeGeometry(shape, extrudeSettings);
    // Extrude 沿 Z 轴挤压（从 z=0 到 z=height）
    // 旋转 90 度后，让高度沿 Y 轴
    geometry.rotateX(-Math.PI / 2);
    // 平移让底部在 y=0，中心在 y=height/2
    geometry.translate(0, height / 2, 0);

    return geometry;
}

function processEdgeGeometry(componentData, mode, depth, componentType) {
    if (!componentData || !componentData.shape) {
        return null;
    }

    // 从 componentData.edge 读取边缘配置，默认为无边缘
    const edgeConfig = componentData.edge || { type: 'none', depth: 0, segments: 4 };
    // 获取分段数，默认 4
    const segments = edgeConfig.segments || 4;

    // 从 componentData.shape 中读取形状参数
    const shapeData = componentData.shape;
    const { type, size1, size2, height } = shapeData;
    const shape = type; // shape 字段就是类型

    const position = componentData.position || { x: 0, y: 0, z: 0 };
    const material = componentData.material || { metalness: 0.3, roughness: 0.4, clearcoat: 0, clearcoatRoughness: 0 };
    const color = componentType === 'base' ? '#8B4513' : '#CD853F';

    // 1. 规则过滤：只处理 base 和 pillar（column），异形跳过
    if (componentType !== 'base' && componentType !== 'column') {
        return null; // 非底座/柱体，跳过
    }

    // 2. 只有 smooth 或 round 模式才处理，其他直接返回原始几何体
    if ((mode !== 'smooth' && mode !== 'round') || depth <= 0) {
        const sides = shapeData.sides;
        return renderComponent(componentType, shape, size1, size2, height, position, material, color, sides);
    }

    // 3. 计算安全深度
    const minSize = Math.min(size1, size2, height);
    const safeDepth = Math.min(depth, minSize / 4);

    // 4. 确定分段数：round 模式固定使用 128，smooth 模式使用用户设置
    const actualSegments = mode === 'round' ? 128 : segments;

    // 4. 分形状实现
    let geometry = null;

    if (shape === 'cube') {
        // 立方体处理 - 使用 createRoundedBoxGeometry
        geometry = createRoundedBoxGeometry(size1, height, size2, 'smooth', safeDepth, actualSegments);

        return (
            <mesh position={[position.x, position.y + height / 2, position.z]} castShadow receiveShadow>
                <primitive object={geometry} />
                <meshStandardMaterial
                    color={color}
                    metalness={material.metalness}
                    roughness={material.roughness}
                    clearcoat={material.clearcoat}
                    clearcoatRoughness={material.clearcoatRoughness}
                />
            </mesh>
        );
    } else if (shape === 'cylinder' || shape === 'cycle') {
        // 圆柱处理（兼容 cycle 和 cylinder 两种命名）
        const radius = size1 / 2;
        geometry = createRoundedCylinderGeometry(radius, height, 512, 'smooth', safeDepth, actualSegments);

        // 几何体底部在 y=0，顶部在 y=height，mesh 位置用 position.y 就能正确对齐
        return (
            <mesh position={[position.x, position.y, position.z]} castShadow receiveShadow>
                <primitive object={geometry} />
                <meshStandardMaterial
                    color={color}
                    metalness={material.metalness}
                    roughness={material.roughness}
                    clearcoat={material.clearcoat}
                    clearcoatRoughness={material.clearcoatRoughness}
                />
            </mesh>
        );
    } else if (shape === 'polygon') {
        // 多边形棱柱处理 - 使用 Extrude + bevel 实现真正的倒角
        const sides = shapeData.sides || 6;
        const radius = size1 / 2;

        try {
            // 构建正多边形轮廓
            const polygonShape = new Shape();
            for (let i = 0; i < sides; i++) {
                // 减去 Math.PI / 2 让第一个顶点在 Y 轴正方向，与 cylinderGeometry 保持一致
                const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
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
                bevelSegments: actualSegments, // 使用实际分段数（round=64 或 smooth=用户设置）
                curveSegments: Math.max(1, sides)
            };

            geometry = new ExtrudeGeometry(polygonShape, extrudeSettings);
            geometry.rotateX(-Math.PI / 2);
            // 不需要平移！让几何体底部在 y=0，顶部在 y=height

            // 几何体底部在 y=0，顶部在 y=height，mesh 位置用 position.y 就能正确对齐
            return (
                <mesh position={[position.x, position.y, position.z]} castShadow receiveShadow>
                    <primitive object={geometry} />
                    <meshStandardMaterial
                        color={color}
                        metalness={material.metalness}
                        roughness={material.roughness}
                        clearcoat={material.clearcoat}
                        clearcoatRoughness={material.clearcoatRoughness}
                    />
                </mesh>
            );
        } catch (error) {
            // 降级到普通圆柱
            return renderComponent(componentType, 'cylinder', size1, size2, height, position, material, color, null);
        }
    } else {
        // 异形或其他形状，跳过处理
        const sides = shapeData.sides;
        return renderComponent(componentType, shape, size1, size2, height, position, material, color, sides);
    }

    // 5. 生成最终模型
    return (
        <mesh position={[position.x, position.y + height / 2, position.z]} castShadow receiveShadow>
            <primitive object={geometry} />
            <meshStandardMaterial
                color={color}
                metalness={material.metalness}
                roughness={material.roughness}
                clearcoat={material.clearcoat}
                clearcoatRoughness={material.clearcoatRoughness}
            />
        </mesh>
    );
}

/**
 * 渲染普通组件（无边缘处理）
 */
function renderComponent(componentType, shape, size1, size2, height, position, material, color, sides) {
    if (shape === 'special') {
        return null; // 异形由其他逻辑处理
    }

    if (shape === 'cylinder' || shape === 'cycle') {
        return (
            <mesh position={[position.x, position.y + height / 2, position.z]} castShadow receiveShadow>
                <cylinderGeometry args={[size1 / 2, size2 / 2, height, 512]} />
                <meshStandardMaterial
                    color={color}
                    metalness={material.metalness}
                    roughness={material.roughness}
                    clearcoat={material.clearcoat}
                    clearcoatRoughness={material.clearcoatRoughness}
                />
            </mesh>
        );
    } else if (shape === 'polygon') {
        const polygonSides = sides || 6;
        return (
            <mesh position={[position.x, position.y + height / 2, position.z]} castShadow receiveShadow>
                <cylinderGeometry args={[size1 / 2, size2 / 2, height, polygonSides]} />
                <meshStandardMaterial
                    color={color}
                    metalness={material.metalness}
                    roughness={material.roughness}
                    clearcoat={material.clearcoat}
                    clearcoatRoughness={material.clearcoatRoughness}
                />
            </mesh>
        );
    } else {
        // cube 或默认
        return (
            <mesh position={[position.x, position.y + height / 2, position.z]} castShadow receiveShadow>
                <boxGeometry args={[size1, height, size2]} />
                <meshStandardMaterial
                    color={color}
                    metalness={material.metalness}
                    roughness={material.roughness}
                    clearcoat={material.clearcoat}
                    clearcoatRoughness={material.clearcoatRoughness}
                />
            </mesh>
        );
    }
}

function ModelRenderer({ chess }) {

    // 添加安全检查，防止 undefined 错误
    if (!chess) {
        return (
            <Canvas camera={{ position: [40, 40, 40] }}>
                <OrbitControls />
                <ambientLight intensity={2.5} />
                <pointLight position={[10, 10, 10]} />
                <Text position={[0, 0, 0]} fontSize={1} color="red">
                    Invalid chess data
                </Text>
            </Canvas>
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

    // 检查是否为异形
    const isBaseSpecial = baseShape?.type === 'special';
    const isColumnSpecial = columnShape?.type === 'special';

    // 渲染底座组件（带边缘处理）
    const renderBaseShape = () => {
        if (!hasBase) return null;

        const { type, size1, size2, height } = baseShape;
        const position = base.position || { x: 0, y: 0, z: 0 };
        const material = base.material || { metalness: 0.3, roughness: 0.4, clearcoat: 0, clearcoatRoughness: 0 };
        const pattern = base.pattern || { shape: 'none', position: { x: 0, y: 0, z: 0 } };
        // 渲染主体元素 
        let bodyelement = null;
        switch (type) {
            case 'circle':
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
            case 'polygon':
                const baseSides = baseShape.sides || 6;
                bodyelement = (
                    <mesh position={[position.x, position.y + height / 2, position.z]} castShadow receiveShadow>
                        <cylinderGeometry args={[size1, size2, height, baseSides]} />
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
                        <boxGeometry args={[size1, height, size2]} />
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
                const baseCustomShape = base.customShape || { profilePoints: [], pathPoints: [] };
                bodyelement = (
                    <group position={[position.x, position.y, position.z]}>
                        <ModelPreview
                            profilePoints={baseCustomShape.profilePoints}
                            pathPoints={baseCustomShape.pathPoints}
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
                    <mesh position={[pattern.position?.x || 0, position.y + height, pattern.position?.z || 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
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
                            <mesh position={[pattern.position?.x || 0, position.y + height + pattern.depth / 2, pattern.position?.z || 0]} castShadow receiveShadow>
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
                            <mesh position={[pattern.position?.x || 0, position.y + height + pattern.depth / 2, pattern.position?.z || 0]} castShadow receiveShadow>
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
                            <mesh position={[pattern.position?.x || 0, position.y + height + pattern.depth / 2, pattern.position?.z || 0]} castShadow receiveShadow>
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
                    default:
                        patternelement = null;
                        break;
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
        const baseheight = base.shape.height || 0;
        let bodyelement = null;
        console.log(type);
        switch (type) {
            case 'circle':
                bodyelement = (
                    <mesh position={[position.x, baseheight + height / 2 + position.y, position.z]} castShadow receiveShadow>
                        <cylinderGeometry args={[size1, size2, height, 64]} />
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
                        <cylinderGeometry args={[size1, size2, height, columnSides]} />
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
                        <boxGeometry args={[size1, height, size2]} />
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
                const columnCustomShape = column.customShape || { profilePoints: [], pathPoints: [] };
                bodyelement = (
                    <group position={[position.x, baseheight + height / 2 + position.y, position.z]}>
                        <ModelPreview
                            profilePoints={columnCustomShape.profilePoints}
                            pathPoints={columnCustomShape.pathPoints}
                        />
                    </group>
                ); break;
            default:
                break;
        }
        //浮雕部分
        let patternelement = null;
        let patternheight = baseheight + height + position.y + pattern.depth / 2
        switch (pattern.shape) {
            case 'none':
                patternelement = null;
                break;
            case 'text':
                patternelement = (
                    <mesh position={[pattern.position?.x || 0, baseheight + height + position.y, pattern.position?.z || 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
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
                            <mesh position={[pattern.position?.x || 0, patternheight, pattern.position?.z || 0]} castShadow receiveShadow>
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
                            <mesh position={[pattern.position?.x || 0, patternheight, pattern.position?.z || 0]} castShadow receiveShadow>
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
                            <mesh position={[pattern.position?.x || 0, patternheight, pattern.position?.z || 0]} castShadow receiveShadow>
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
                    default:
                        patternelement = null;
                        break;
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
    // 渲染自定义异形组件
    const renderCustomShape = (componentType) => {
        const component = componentType === 'base' ? base : column;
        const customShape = component?.customShape;

        if (!customShape || !customShape.profilePoints || customShape.profilePoints.length < 3) {
            return null;
        }

        const profilePoints = customShape.profilePoints;
        const pathPoints = customShape.pathPoints || [];

        // 计算位置偏移
        const position = component.position || { x: 0, y: 0, z: 0 };
        const shapeData = component.shape || {};
        const height = shapeData.height || (componentType === 'base' ? 1 : 20);

        return (
            <group position={[position.x, position.y, position.z]}>
                <ModelPreview
                    profilePoints={profilePoints}
                    pathPoints={pathPoints.length >= 3 ? pathPoints : null}
                />
            </group>
        );
    };

    return (
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
            <OrbitControls />

            {/* 基础环境光 */}
            <ambientLight intensity={0.5} />

            {/* 使用本地 HDRI 贴图作为环境 */}
            <Environment files="/stage.hdr" background />

            {/* 主方向光 */}
            <directionalLight
                position={[50, 80, 50]}
                intensity={2}
                castShadow
            />

            <primitive object={new AxesHelper(30)} />
            <Text position={[30.5, 0, 0]} fontSize={0.8} color="red">X</Text>
            <Text position={[0, 30.5, 0]} fontSize={0.8} color="green">Y</Text>
            <Text position={[0, 0, 30.5]} fontSize={0.8} color="blue">Z</Text>

            {/* 渲染底座 */}
            {renderBaseShape()}

            {/* 渲染底座的异形 */}
            {isBaseSpecial && renderCustomShape('base')}

            {/* 渲染柱体 */}
            {renderColumnShape()}

            {/* 渲染柱体的异形 */}
            {isColumnSpecial && renderCustomShape('column')}

            {/* 渲染装饰 */}
            {hasDecoration && decoration.modelId && (
                <mesh position={[decoration.position?.x || 0, decoration.position?.y || 0, decoration.position?.z || 0]}>
                    <sphereGeometry args={[2]} />
                    <meshStandardMaterial color="#FFD700" />
                </mesh>
            )}
        </Canvas>
    )
}

export default ModelRenderer;
