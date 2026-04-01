import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { STLLoader } from 'three-stdlib';
import { OBJLoader } from 'three-stdlib';
import './DecorationPreviewModal.css';

function Model({ url, fileType }) {
  const meshRef = useRef();
  const { scene } = useThree();

  useEffect(() => {
    if (!url) return;

    const loader = fileType === 'stl' ? new STLLoader() : new OBJLoader();

    loader.load(
      url,
      (result) => {
        let geometry;
        let material;

        if (fileType === 'stl') {
          geometry = result;
          material = new THREE.MeshStandardMaterial({
            color: '#8B4513',
            metalness: 0.3,
            roughness: 0.6,
            side: THREE.DoubleSide
          });
          const mesh = new THREE.Mesh(geometry, material);

          geometry.computeBoundingBox();
          const boundingBox = geometry.boundingBox;
          const center = new THREE.Vector3();
          boundingBox.getCenter(center);
          mesh.position.sub(center);

          const size = new THREE.Vector3();
          boundingBox.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 5 / maxDim;
          mesh.scale.setScalar(scale);

          mesh.castShadow = true;
          mesh.receiveShadow = true;

          scene.add(mesh);
          if (meshRef.current) {
            meshRef.current = mesh;
          }
        } else {
          const obj = result;

          const box = new THREE.Box3().setFromObject(obj);
          const center = new THREE.Vector3();
          box.getCenter(center);
          obj.position.sub(center);

          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 5 / maxDim;
          obj.scale.setScalar(scale);

          obj.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (!child.material) {
                child.material = new THREE.MeshStandardMaterial({
                  color: '#8B4513',
                  metalness: 0.3,
                  roughness: 0.6
                });
              }
            }
          });

          scene.add(obj);
          if (meshRef.current) {
            meshRef.current = obj;
          }
        }
      },
      (progress) => {
        console.log('Loading progress:', (progress.loaded / progress.total) * 100 + '%');
      },
      (error) => {
        console.error('Error loading model:', error);
      }
    );

    return () => {
      while (scene.children.length > 0) {
        const child = scene.children[0];
        scene.remove(child);
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    };
  }, [url, fileType, scene]);

  return null;
}

function Scene({ url, fileType }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} />
      <Model url={url} fileType={fileType} />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1}
        maxDistance={50}
      />
      <Environment preset="studio" />
    </>
  );
}

function DecorationPreviewModal({ isOpen, onClose, decoration }) {
  const getFileExtension = (filename) => {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  };

  const fileType = useMemo(() => {
    if (!decoration?.file) return null;
    const ext = getFileExtension(decoration.file);
    if (ext === 'stl' || ext === 'obj') return ext;
    return null;
  }, [decoration]);

  const modelUrl = decoration?.file || null;

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="preview-modal-overlay" onClick={handleOverlayClick}>
      <div className="preview-modal">
        <div className="preview-modal-header">
          <h2>预览 - {decoration?.name || '未命名装饰'}</h2>
          <button className="preview-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="preview-modal-content">
          {!modelUrl && (
            <div className="preview-error">
              <span className="error-icon">⚠️</span>
              <span>无模型文件可预览</span>
            </div>
          )}

          {modelUrl && !fileType && (
            <div className="preview-error">
              <span className="error-icon">⚠️</span>
              <span>不支持的文件格式，仅支持 STL 和 OBJ 格式</span>
            </div>
          )}

          {modelUrl && fileType && (
            <div className="preview-canvas-container">
              <Canvas
                camera={{ position: [8, 8, 8], fov: 50 }}
                shadows
                style={{ background: '#f0f0f0' }}
              >
                <Scene url={modelUrl} fileType={fileType} />
              </Canvas>
            </div>
          )}
        </div>

        <div className="preview-modal-footer">
          <div className="preview-info">
            <span className="info-label">文件格式：</span>
            <span className="info-value">{fileType?.toUpperCase() || '未知'}</span>
          </div>
          <button className="btn btn-secondary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

export default DecorationPreviewModal;
