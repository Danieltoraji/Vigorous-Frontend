import {
    Mesh,
    Group,
    BoxGeometry,
    BufferGeometry
} from "three";

import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";


/**
 * 验证并修复 geometry
 * 如果 geometry 无效，返回一个占位的 BufferGeometry
 */
function validateOrFixGeometry(mesh) {
    let geometry = mesh.geometry;
    if (!geometry || !(geometry instanceof BufferGeometry) ||
        !geometry.attributes?.position ||
        geometry.attributes.position.count < 3) {
        geometry = createDefaultGeometry();
    } else if (geometry.index !== null) {
        geometry = geometry.toNonIndexed();
    }
    return geometry;
}


/**
 * 创建默认 geometry（用于替换无效的 geometry）
 * @returns {BoxGeometry} 默认的立方体几何体
 */
function createDefaultGeometry() {
    return new BoxGeometry(0.01, 0.01, 0.01);
}


/**
 * 遍历 scene/group 收集所有 Mesh
 * 支持 Text3D、浮雕、自定义异形 mesh 等所有类型
 */
function collectMeshes(root) {
    const meshes = [];
    root.updateMatrixWorld(true);
    root.traverse(obj => {
        if (obj.isMesh && obj.visible) {
            const geometry = validateOrFixGeometry(obj).clone();
            geometry.applyMatrix4(obj.matrixWorld);
            meshes.push(new Mesh(geometry, obj.material));
        }
    });
    return meshes;
}



/**
 * 导出 STL - 直接导出整个 Group
 * 支持 Text3D、浮雕（ExtrudeGeometry）等复杂几何体
 * 自动处理索引几何体转换和无效 geometry 修复
 */
export function exportSceneDirect(root, format = "stl") {
    const meshes = collectMeshes(root);
    if (meshes.length === 0) throw new Error("没有可导出的 Mesh");

    const tempGroup = new Group();
    meshes.forEach(m => tempGroup.add(m));

    let exporter;
    let result;

    if (format === "stl") {
        exporter = new STLExporter();
        result = exporter.parse(tempGroup, { binary: true });
        return new Blob([result], { type: "application/octet-stream" });
    } else if (format === "obj") {
        exporter = new OBJExporter();
        result = exporter.parse(tempGroup);
        return new Blob([result], { type: "model/obj" });
    } else {
        throw new Error(`不支持的格式: ${format}`);
    }
}





/**
 * 导出 Scene / Group（统一入口函数）
 * 
 * @param {THREE.Group|THREE.Scene} root - 要导出的根组或场景
 * @param {string} format - 导出格式："stl" | "obj" | "json"
 * @returns {Promise<Blob>} 导出的文件 Blob
 * 
 * @example
 * 
 */
export async function exportScene(jsoninput, root, format = "stl") {
    format = format.toLowerCase();
    try {
        if (format === "json") {
            if (!jsoninput) {
                throw new Error('导出失败：jsoninput 参数为空');
            }
            // JSON 格式直接序列化，处理没有toJSON方法的对象
            const jsonData = JSON.stringify(jsoninput, null, 2);
            return new Blob([jsonData], { type: 'application/json' });
        }
        else if (format === "stl" || format === "obj") {
            if (!root) {
                throw new Error('导出失败：root 参数为空');
            }
            return exportSceneDirect(root, format);
        }

        throw new Error(`不支持的格式：${format}。支持的格式：stl, obj, json`);

    } catch (error) {
        console.error('❌ 导出失败:', error);
        throw error;
    }
}


/**
 * 下载 Blob 文件
 * 
 * @param {Blob} blob - 要下载的文件 Blob
 * @param {string} filename - 文件名
 * 
 * @example
 * downloadBlob(stlBlob, 'chess-model.stl');
 */
export function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}


/**
 * 生成安全的导出文件名
 * 移除特殊字符，添加时间戳
 * 
 * @param {string} chessName - 棋子名称
 * @param {string} format - 文件格式
 * @returns {string} 安全的文件名
 * 
 */
export function generateExportFilename(chessName, format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const safeName = chessName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
    return `${safeName}_${timestamp}.${format}`;
}


/**
 * 辅助工具：验证 mesh 是否可导出
 * 
 * @param {THREE.Mesh} mesh - 要验证的 mesh
 * @returns {boolean} 是否可导出
 */
export function isMeshExportable(mesh) {
    if (!mesh) return false;
    if (!mesh.isMesh) return false;
    if (!mesh.visible) return false;

    try {
        const geometry = validateOrFixGeometry(mesh);
        // 如果能返回 geometry（包括默认的），就说明可导出
        return !!geometry;
    } catch (error) {
        return false;
    }
}