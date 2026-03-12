import React, { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Environment, Text3D } from '@react-three/drei';
import * as THREE from 'three';
import { ModelPreview } from '../../../Components/CustomRevolutionGenerator/CustomRevolutionGenerator.jsx';

// 从 THREE 命名空间获取常用几何体和工具
const { AxesHelper, ExtrudeGeometry, Shape } = THREE;

/**
 * SceneContent component - contains all scene objects and model rendering logic
 * This component has access to the Three.js scene via useThree() hook
 */
function SceneContent({ chess, onModelReady }) {
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
        // 渲染主体元素 
        let bodyelement = null;
        switch (type) {
            case 'cycle':
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
                const baseCustomShape = base.customShape || { profilePoints: [], pathPoints: [], generated: false };
                bodyelement = (
                    <group position={[position.x, position.y, position.z]}>
                        <ModelPreview
                            profilePoints={baseCustomShape.profilePoints}
                            pathPoints={baseCustomShape.pathPoints}
                            generated={baseCustomShape.generated}
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
                            <mesh position={[pattern.position?.x || 0, position.y + height + pattern.depth / 2 + (pattern.position?.y || 0), pattern.position?.z || 0]} castShadow receiveShadow>
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
                            <mesh position={[pattern.position?.x || 0, position.y + height + pattern.depth / 2 + (pattern.position?.y || 0), pattern.position?.z || 0]} castShadow receiveShadow>
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
            case 'cycle':
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
                const columnCustomShape = column.customShape || { profilePoints: [], pathPoints: [], generated: false };
                bodyelement = (
                    <group position={[position.x, baseheight + height / 2 + position.y, position.z]}>
                        <ModelPreview
                            profilePoints={columnCustomShape.profilePoints}
                            pathPoints={columnCustomShape.pathPoints}
                            generated={columnCustomShape.generated}
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

function ModelRenderer({ chess, onModelReady }) {
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
            <SceneContent chess={chess} onModelReady={onModelReady} />
        </Canvas>
    )
}

export default ModelRenderer;
