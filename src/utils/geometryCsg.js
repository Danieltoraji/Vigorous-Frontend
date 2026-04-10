import * as THREE from 'three';
import { ADDITION, INTERSECTION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';


const boxA = new THREE.Box3();
const boxB = new THREE.Box3();

function flipIndexedWinding(geometry) {
    const indexAttr = geometry.index;
    if (!indexAttr) return;

    const array = indexAttr.array;
    for (let i = 0; i < array.length; i += 3) {
        const tmp = array[i + 1];
        array[i + 1] = array[i + 2];
        array[i + 2] = tmp;
    }
    indexAttr.needsUpdate = true;
}

function flipNonIndexedWinding(geometry) {
    const pos = geometry.attributes.position;
    if (!pos) return;

    const array = pos.array;
    for (let i = 0; i < array.length; i += 9) {
        const bx = array[i + 3];
        const by = array[i + 4];
        const bz = array[i + 5];

        array[i + 3] = array[i + 6];
        array[i + 4] = array[i + 7];
        array[i + 5] = array[i + 8];

        array[i + 6] = bx;
        array[i + 7] = by;
        array[i + 8] = bz;
    }
    pos.needsUpdate = true;
}

function flipGeometryWinding(geometry) {
    if (!geometry) return;
    if (geometry.index) {
        flipIndexedWinding(geometry);
    } else {
        flipNonIndexedWinding(geometry);
    }

    if (geometry.attributes.normal) {
        const normals = geometry.attributes.normal.array;
        for (let i = 0; i < normals.length; i++) {
            normals[i] = -normals[i];
        }
        geometry.attributes.normal.needsUpdate = true;
    }
}

function computeSignedVolume(geometry) {
    if (!geometry?.attributes?.position) return 0;

    const pos = geometry.attributes.position;
    let volume = 0;

    if (geometry.index) {
        const idx = geometry.index.array;
        for (let i = 0; i < idx.length; i += 3) {
            const ia = idx[i];
            const ib = idx[i + 1];
            const ic = idx[i + 2];

            const ax = pos.getX(ia), ay = pos.getY(ia), az = pos.getZ(ia);
            const bx = pos.getX(ib), by = pos.getY(ib), bz = pos.getZ(ib);
            const cx = pos.getX(ic), cy = pos.getY(ic), cz = pos.getZ(ic);

            volume += ax * (by * cz - bz * cy) + bx * (cy * az - cz * ay) + cx * (ay * bz - az * by);
        }
    } else {
        for (let i = 0; i < pos.count; i += 3) {
            const ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i);
            const bx = pos.getX(i + 1), by = pos.getY(i + 1), bz = pos.getZ(i + 1);
            const cx = pos.getX(i + 2), cy = pos.getY(i + 2), cz = pos.getZ(i + 2);

            volume += ax * (by * cz - bz * cy) + bx * (cy * az - cz * ay) + cx * (ay * bz - az * by);
        }
    }

    return volume / 6;
}

function ensureOutwardFacing(geometry) {
    const signedVolume = computeSignedVolume(geometry);
    if (signedVolume < 0) {
        flipGeometryWinding(geometry);
    }
}

// 将 mesh 的所有变换 bake 到 geometry 中，并清空 mesh 的 transform
// 这是 CSG 运算前必须的步骤，因为 CSG 库只操作 geometry 顶点坐标，不会自动应用 mesh 的变换
function bakeMesh(mesh) {
    if (!mesh || !mesh.geometry) return mesh;

    // 1. 先更新本地矩阵（应用 position/rotation/scale）
    mesh.updateMatrix();

    // 2. 再更新世界矩阵
    mesh.updateMatrixWorld(true);

    // 记录变换手性，避免 reset transform 后丢失负缩放信息
    const determinant = mesh.matrixWorld.determinant();

    // 3. 克隆 geometry 并应用 mesh 的变换矩阵到顶点坐标
    const bakedGeometry = mesh.geometry.clone();
    bakedGeometry.applyMatrix4(mesh.matrixWorld);

    if (determinant < 0) {
        flipGeometryWinding(bakedGeometry);
    }

    // 4. 更新法向量
    bakedGeometry.computeVertexNormals();

    // 5. 清空 mesh 的变换（避免 CSG 后的几何体被重复变换）
    mesh.geometry = bakedGeometry;
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);
    mesh.updateMatrix();
    mesh.updateMatrixWorld(true);

    return mesh;
}

function mapOperation(operationType) {
    switch ((operationType || 'none').toLowerCase()) {
        case 'none':
            return null;
        case 'union':
            return ADDITION;
        case 'intersect':
            return INTERSECTION;
        case 'subtract':
        default:
            return SUBTRACTION;
    }
}

function normalizeGeometry(geometry) {
    if (!geometry || !geometry.attributes?.position) return null;

    const clone = geometry.clone();
    if (!clone.index) {
        const count = clone.attributes.position.count;
        const index = new Array(count);
        for (let i = 0; i < count; i++) {
            index[i] = i;
        }
        clone.setIndex(index);
    }

    clone.clearGroups();
    clone.computeVertexNormals();
    ensureOutwardFacing(clone);
    clone.computeVertexNormals();

    clone.computeBoundingBox();
    clone.computeBoundingSphere();

    const drawCount = clone.index ? clone.index.count : clone.attributes.position.count;
    clone.setDrawRange(0, drawCount);

    return clone;
}

function createBrushFromMesh(mesh) {
    mesh.updateMatrixWorld(true);
    const geometry = normalizeGeometry(mesh.geometry);
    if (!geometry) return null;

    ensureOutwardFacing(geometry);
    geometry.computeVertexNormals();

    const brush = new Brush(geometry);
    brush.updateMatrixWorld(true);
    return brush;
}

export function applyBooleanOperation(meshA, meshB, operationType = 'none') {
    const evaluator = new Evaluator();
    evaluator.useGroups = false;
    evaluator.consolidateGroups = false;
    evaluator.removeUnusedMaterials = false;
    if (!meshA?.geometry || !meshB?.geometry) {
        return null;
    }

    const mappedOperation = mapOperation(operationType);
    if (!mappedOperation) {
        return null;
    }

    // 关键步骤：在布尔操作前，将所有变换 bake 到 geometry 中
    // 这样 CSG 库才能正确处理旋转、缩放等变换
    bakeMesh(meshA);
    bakeMesh(meshB);

    // 更新世界矩阵
    meshA.updateMatrixWorld(true);
    meshB.updateMatrixWorld(true);

    // 检查包围盒是否相交
    boxA.setFromObject(meshA);
    boxB.setFromObject(meshB);
    if (!boxA.intersectsBox(boxB)) {
        return null;
    }

    const brushA = createBrushFromMesh(meshA);
    const brushB = createBrushFromMesh(meshB);
    if (!brushA || !brushB) {
        return null;
    }

    try {
        const result = evaluator.evaluate(brushA, brushB, mappedOperation);
        if (!result?.geometry) {
            return null;
        }
        const normalizedResult = normalizeGeometry(result.geometry);
        if (!normalizedResult) {
            return null;
        }

        ensureOutwardFacing(normalizedResult);
        normalizedResult.computeVertexNormals();
        return normalizedResult;
    } catch (error) {
        console.error('[CSG] Boolean operation failed:', error);
        return null;
    }
}
