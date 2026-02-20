import ReactDOM from 'react-dom'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { AxesHelper } from 'three'

function ModelRenderer({ chess }) {
    const part1 = chess.parts['1'];
    const part2 = chess.parts['2'];
    const part3 = chess.parts['3'];
    const part4 = chess.parts['4'];
    
  return (
    <Canvas camera={{ position: [40, 40, 40] }}>
      <OrbitControls />
      <ambientLight intensity={2.5} />
      <pointLight position={[10, 10, 10]} />
      
      <primitive object={new AxesHelper(30)} />
      <Text position={[30.5, 0, 0]} fontSize={0.8} color="red">X</Text>
      <Text position={[0, 30.5, 0]} fontSize={0.8} color="green">Y</Text>
      <Text position={[0, 0, 30.5]} fontSize={0.8} color="blue">Z</Text>
      
      {/** 1 渲染part1底座层 */}
      {part1.Appear === 'True' && (    // 如果part1可见
        part1.Shape.type === 'Circle' && (// 如果part1是圆
          <mesh position={[part1.Shape.position.x, part1.Shape.position.y, part1.Shape.position.z]}>
            <cylinderGeometry args={[part1.Shape.size1, part1.Shape.size1, part1.Shape.height, 64]} />
            <meshStandardMaterial color={part1.Shape.color} />
          </mesh>
        )
        || part1.Shape.type === 'Rectangle' && (// 如果part1是矩形
          <mesh position={[part1.Shape.position.x, part1.Shape.position.y, part1.Shape.position.z]}>
            <boxGeometry args={[part1.Shape.size1, part1.Shape.height, part1.Shape.size2]} />
            <meshStandardMaterial color={part1.Shape.color} />
          </mesh>
        )
        || part1.Shape.type === 'Triangle' && (// 如果part1是三角形
          <mesh position={[part1.Shape.position.x, part1.Shape.position.y, part1.Shape.position.z]}>
            <cylinderGeometry args={[part1.Shape.size1, part1.Shape.size1, part1.Shape.height, 3]} />
            <meshStandardMaterial color={part1.Shape.color} />
          </mesh>
        )
        || part1.Shape.type === 'Square' && (// 如果part1是正方形
          <mesh position={[part1.Shape.position.x, part1.Shape.position.y, part1.Shape.position.z]}>
            <boxGeometry args={[part1.Shape.size1, part1.Shape.height, part1.Shape.size1]} />
            <meshStandardMaterial color={part1.Shape.color} />
          </mesh>
        )
        || part1.Shape.type === 'Hexagon' && (// 如果part1是六边形
          <mesh position={[part1.Shape.position.x, part1.Shape.position.y, part1.Shape.position.z]}>
            <cylinderGeometry args={[part1.Shape.size1, part1.Shape.size1, part1.Shape.height, 6]} />
            <meshStandardMaterial color={part1.Shape.color} />
          </mesh>
        )
      )}

      {/** 2 渲染part2单位层 */}
      {part2.Appear === 'True' && (    // 如果part2可见
        part2.Shape.type === 'Circle' && (// 如果part2是圆
          <mesh position={[part2.Shape.position.x, part2.Shape.position.y, part2.Shape.position.z]}>
            <cylinderGeometry args={[part2.Shape.size1, part2.Shape.size1, part2.Shape.height, 64]} />
            <meshStandardMaterial color={part2.Shape.color} />
          </mesh>
        )
        || part2.Shape.type === 'Rectangle' && (// 如果part2是矩形
          <mesh position={[part2.Shape.position.x, part2.Shape.position.y, part2.Shape.position.z]}>
            <boxGeometry args={[part2.Shape.size1, part2.Shape.height, part2.Shape.size2]} />
            <meshStandardMaterial color={part2.Shape.color} />
          </mesh>
        )
        || part2.Shape.type === 'Triangle' && (// 如果part2是三角形
          <mesh position={[part2.Shape.position.x, part2.Shape.position.y, part2.Shape.position.z]}>
            <cylinderGeometry args={[part2.Shape.size1, part2.Shape.size1, part2.Shape.height, 3]} />
            <meshStandardMaterial color={part2.Shape.color} />
          </mesh>
        )
        || part2.Shape.type === 'Square' && (// 如果part2是正方形
          <mesh position={[part2.Shape.position.x, part2.Shape.position.y, part2.Shape.position.z]}>
            <boxGeometry args={[part2.Shape.size1, part2.Shape.height, part2.Shape.size1]} />
            <meshStandardMaterial color={part2.Shape.color} />
          </mesh>
        )
        || part2.Shape.type === 'Hexagon' && (// 如果part2是六边形
          <mesh position={[part2.Shape.position.x, part2.Shape.position.y, part2.Shape.position.z]}>
            <cylinderGeometry args={[part2.Shape.size1, part2.Shape.size1, part2.Shape.height, 6]} />
            <meshStandardMaterial color={part2.Shape.color} />
          </mesh>
        )
      )}
    </Canvas>
  )
}
export default ModelRenderer;