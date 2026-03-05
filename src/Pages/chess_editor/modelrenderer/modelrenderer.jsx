import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Text3D } from '@react-three/drei';
import { AxesHelper } from 'three';
import { ModelPreview } from '../../../Components/CustomRevolutionGenerator/CustomRevolutionGenerator.jsx';
function ModelRenderer({ chess }) {
   
    // 添加安全检查，防止 undefined 错误
    if (!chess) {
        console.warn('Chess data is invalid:', chess);
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
    const base = chess.components?.base;
    const column = chess.components?.column;
    const decoration = chess.components?.decoration;
    
    // 确保组件数据存在
    const hasBase = base && base.shape;
    const hasColumn = column && column.shape;
    const hasDecoration = decoration;
    
    // 提取基础形状数据
    const baseShape = hasBase ? base.shape : null;
    const columnShape = hasColumn ? column.shape : null;
    
    // 渲染基础形状组件
    const renderBaseShape = () => {
        if (!hasBase) return null;
        
        const { type, size1, size2, height } = baseShape;
        const position = base.position || { x: 0, y: 0, z: 0 };
        const material = base.material || { metalness: 0.3, roughness: 0.4, clearcoat: 0, clearcoatRoughness: 0 };
        const pattern = base.pattern || {shape:'none', position: {x: 0, y: 0, z: 0}};
        // 渲染主体元素 
        let bodyelement = null;
        switch (type) {
            case 'cylinder':
                bodyelement = (
                    <mesh position={[position.x, position.y + height/2, position.z]} castShadow receiveShadow>
                        <cylinderGeometry args={[size1, size2, height, 64]} />
                        <meshStandardMaterial 
                            color="#8B4513" 
                            metalness={material.metalness}
                            roughness={material.roughness}
                            clearcoat={material.clearcoat}
                            clearcoatRoughness={material.clearcoatRoughness}
                        />
                    </mesh>
                );break;
            case 'polygon':
                const baseSides = baseShape.sides || 6;
                bodyelement = (
                    <mesh position={[position.x, position.y + height/2, position.z]} castShadow receiveShadow>
                        <cylinderGeometry args={[size1, size2, height, baseSides]} />
                        <meshStandardMaterial 
                            color="#8B4513" 
                            metalness={material.metalness}
                            roughness={material.roughness}
                            clearcoat={material.clearcoat}
                            clearcoatRoughness={material.clearcoatRoughness}
                        />
                    </mesh>
                );break;
            case 'cube':
                bodyelement = (
                    <mesh position={[position.x, position.y + height/2, position.z]} castShadow receiveShadow>
                        <boxGeometry args={[size1, height, size2]} />
                        <meshStandardMaterial 
                            color="#8B4513" 
                            metalness={material.metalness}
                            roughness={material.roughness}
                            clearcoat={material.clearcoat}
                            clearcoatRoughness={material.clearcoatRoughness}
                        />
                    </mesh>
                );break;
            case 'special': // 异形类型
                const baseCustomShape = base.customShape || { profilePoints: [], pathPoints: [] };
                bodyelement = (
                    <group position={[position.x, position.y, position.z]}>
                        <ModelPreview 
                            profilePoints={baseCustomShape.profilePoints}
                            pathPoints={baseCustomShape.pathPoints}
                        />
                    </group>
                );break;
            default:
                bodyelement = (
                    <mesh position={[position.x, position.y + height/2, position.z]} castShadow receiveShadow>
                        <cylinderGeometry args={[size1, size2, height, 64]} />
                        <meshStandardMaterial 
                            color="#8B4513" 
                            metalness={material.metalness}
                            roughness={material.roughness}
                            clearcoat={material.clearcoat}
                            clearcoatRoughness={material.clearcoatRoughness}
                        />
                    </mesh>
                );break;
        }

        //浮雕图案
        let patternelement = null;
        
        switch (pattern.shape) {
            case 'none':
                patternelement = null;
                break;
            case 'text':
                patternelement = (
                    <mesh position={[pattern.position?.x || 0, position.y + height, pattern.position?.z || 0]} rotation={[-Math.PI/2,0,0]} castShadow receiveShadow>
                        <Text3D 
                        font={"https://threejs.org/examples/fonts/helvetiker_regular.typeface.json"}
                        size= {pattern.size || 5}
                        height= {pattern.depth || 1}
                        curveSegments= {12}
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

    // 渲染柱体组件
    const renderColumnShape = () => {
        if (!hasColumn) return null;
        
        const { type, size1, size2, height } = columnShape;
        const position = column.position || { x: 0, y: 0, z: 0 };
        const material = column.material || { metalness: 0.3, roughness: 0.4, clearcoat: 0, clearcoatRoughness: 0 };
        const pattern = column.pattern || { shape: 'none' };
        let bodyelement = null;
        switch (type) {
            case 'cylinder':
                bodyelement = (
                    <mesh position={[position.x, position.y + height/2, position.z]} castShadow receiveShadow>
                        <cylinderGeometry args={[size1, size2, height, 64]} />
                        <meshStandardMaterial 
                            color="#CD853F" 
                            metalness={material.metalness}
                            roughness={material.roughness}
                            clearcoat={material.clearcoat}
                            clearcoatRoughness={material.clearcoatRoughness}
                        />
                    </mesh>
                );break;
            case 'polygon':
                const columnSides = columnShape.sides || 6;
                bodyelement = (
                    <mesh position={[position.x, position.y + height/2, position.z]} castShadow receiveShadow>
                        <cylinderGeometry args={[size1, size2, height, columnSides]} />
                        <meshStandardMaterial 
                            color="#CD853F" 
                            metalness={material.metalness}
                            roughness={material.roughness}
                            clearcoat={material.clearcoat}
                            clearcoatRoughness={material.clearcoatRoughness}
                        />
                    </mesh>
                );break;
            case 'cube':
                bodyelement = (
                    <mesh position={[position.x, position.y + height/2, position.z]} castShadow receiveShadow>
                        <boxGeometry args={[size1, height, size2]} />
                        <meshStandardMaterial 
                            color="#CD853F" 
                            metalness={material.metalness}
                            roughness={material.roughness}
                            clearcoat={material.clearcoat}
                            clearcoatRoughness={material.clearcoatRoughness}
                        />
                    </mesh>
                );break;
                const baseSides = baseShape.sides || 6;
                bodyelement = (
                    <mesh position={[position.x, position.y + height/2, position.z]} castShadow receiveShadow>
                        <cylinderGeometry args={[size1, size2, height, baseSides]} />
                        <meshStandardMaterial 
                            color="#8B4513" 
                            metalness={material.metalness}
                            roughness={material.roughness}
                            clearcoat={material.clearcoat}
                            clearcoatRoughness={material.clearcoatRoughness}
                        />
                    </mesh>
                );break;
            case 'special': // 异形类型
                const columnCustomShape = column.customShape || { profilePoints: [], pathPoints: [] };
                bodyelement = (
                    <group position={[position.x, position.y, position.z]}>
                        <ModelPreview 
                            profilePoints={columnCustomShape.profilePoints}
                            pathPoints={columnCustomShape.pathPoints}
                        />
                    </group>
                );break;
            default:
                bodyelement = (
                    <mesh position={[position.x, position.y + height/2, position.z]} castShadow receiveShadow>
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
        }
            //浮雕部分
        let patternelement = null;
        switch (pattern.shape){
            case 'text':
                patternelement = (
                    <mesh position={[pattern.position?.x || 0, position.y + height, pattern.position?.z || 0]} rotation={[-Math.PI/2,0,0]} castShadow receiveShadow>
                        <Text3D 
                        font={"https://threejs.org/examples/fonts/helvetiker_regular.typeface.json"}
                        size= {pattern.size || 5}
                        height= {pattern.depth || 1}
                        curveSegments= {12}
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
                patternelement = null;break;
            case 'none':
                patternelement = null;break;
        }
        return (
            <group>
                {bodyelement}
                {patternelement}
            </group>
        );
    };
        

  return (
    <Canvas camera={{ position: [40, 40, 40] }} shadows>
      <OrbitControls />
      
      {/* 增强光照和阴影效果 */}
      <ambientLight intensity={2} />
      <directionalLight 
        position={[50, 80, 50]} 
        intensity={3} 
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      <directionalLight 
        position={[-30, 40, -30]} 
        intensity={1.5}
      />
      <pointLight position={[0, 100, 0]} intensity={2} />
      
      <primitive object={new AxesHelper(30)} />
      <Text position={[30.5, 0, 0]} fontSize={0.8} color="red">X</Text>
      <Text position={[0, 30.5, 0]} fontSize={0.8} color="green">Y</Text>
      <Text position={[0, 0, 30.5]} fontSize={0.8} color="blue">Z</Text>
      
      {/* 渲染底座 */}
      {renderBaseShape()}
      
      {/* 渲染柱体 */}
      {renderColumnShape()}
      
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