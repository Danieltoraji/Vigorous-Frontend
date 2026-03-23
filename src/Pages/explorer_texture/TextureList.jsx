import TextureItem from './TextureItem.jsx'
import './TextureList.css'


function TextureList({ textures, onEditTexture, onDeleteTexture, onUploadTexture }) {


  return (
    <div className="texture-list">
      <div className="texture-list-header">
        <h2>我的纹理</h2>
        <button className="btn btn-primary" onClick={onUploadTexture}>
          上传新纹理
        </button>
      </div>

      <div className="texture-grid">
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
