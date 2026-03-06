/**
 * 资源管理器，用于管理：
 * 贴图
 * 纹理
 */
import { useUser } from '../../hooks/useUser.jsx'
import { useNavigate } from 'react-router-dom'

function ExplorerTexture() {
  const { userData } = useUser()
  const navigate = useNavigate()
  const onBack = () => {
    navigate('/menu')
  }
  return (
    <div>
      <button className="back-button" onClick={onBack}>
          ← 返回
        </button>
      <h1>贴图资源管理器</h1>
      <p>当前用户：{userData.username}</p>
    </div>
  )
}
export default ExplorerTexture