import TextureItem from './TextureItem.jsx'
import './TextureList.css'


function TextureList({ textures, onEditTexture, onDeleteTexture, onUploadTexture }) {


  return (
    <div className="texture-list">
      <div className="texture-list-header">
        <div className="texture-list-title-group">
          <h2>我的纹理</h2>
          <span className="texture-list-subtitle">单击纹理以打开编辑</span>
        </div>
        <button className="btn btn-primary" onClick={onUploadTexture}>
          上传新纹理
        </button>
      </div>

      <div className="texture-explorer-grid">
        {textures?.map(texture => (
          <TextureItem
            key={texture.id}
            texture={texture}
            onEditTexture={onEditTexture}
            onDeleteTexture={onDeleteTexture}
          />
        ))}
      </div>
    </div>
  )
}

export default TextureList
