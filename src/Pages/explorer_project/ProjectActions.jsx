import { useEffect, useRef, useState } from 'react'
import './ProjectActions.css'

function ProjectActions({ onEdit, onOpen, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return undefined

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  return (
    <div className="project-actions">
      <div className="more-actions" ref={menuRef}>
        <button
          type="button"
          className="btn btn-outline more-actions-toggle"
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label="更多操作"
          title="更多操作"
        >
          ...
        </button>
        {menuOpen && (
          <div className="more-actions-menu">
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                setMenuOpen(false)
                onEdit()
              }}
            >
              编辑信息
            </button>
            <button
              type="button"
              className="menu-item delete"
              onClick={() => {
                setMenuOpen(false)
                onDelete()
              }}
            >
              删除项目
            </button>
          </div>
        )}
      </div>

      <button className="btn btn-primary" onClick={onOpen}>
        打开项目
      </button>
    </div>
  )
}

export default ProjectActions
