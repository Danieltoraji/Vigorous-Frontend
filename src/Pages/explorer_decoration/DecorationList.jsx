import DecorationItem from './DecorationItem.jsx'
import './DecorationList.css'


function DecorationList({ decorations, onEditDecoration, onDeleteDecoration, onUploadDecoration, onPreviewDecoration }) {


  return (
    <div className="decoration-list">
      <div className="decoration-list-header">
        <h2>我的装饰</h2>
        <button className="btn btn-primary" onClick={onUploadDecoration}>
          上传新装饰
        </button>
      </div>

      <div className="decoration-grid">
        {decorations?.map(decoration => (
          <DecorationItem
            key={decoration.id}
            decoration={decoration}
            onEditDecoration={onEditDecoration}
            onDeleteDecoration={onDeleteDecoration}
            onPreviewDecoration={onPreviewDecoration}
          />
        ))}
      </div>
    </div>
  )
}

export default DecorationList
