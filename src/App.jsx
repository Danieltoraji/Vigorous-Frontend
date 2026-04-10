/*
 * App.jsx
 * 这里是我们的主页面。
 */
import { useEffect, useState } from 'react'
import './App.css'
import Home from './Pages/home/home.jsx'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import ExplorerProject from './Pages/explorer_project/explorer_project.jsx'
import ExplorerTexture from './Pages/explorer_texture/explorer_texture.jsx'
import ExplorerDecoration from './Pages/explorer_decoration/explorer_decoration.jsx'
import ExplorerTemplates from './Pages/explorer_templates/explorer_templates.jsx'
import ChessEditor from './Pages/chess_editor/chess_editor.jsx'
import ProjectEditor from './Pages/project_editor/ProjectEditor.jsx'
import TemplateEditor from './Pages/template_editor/template_editor.jsx'
import Test from './Pages/test.jsx'

import AppBottom from './Components/Appbottom/Appbottom.jsx'

const DEVICE_WARNING_KEY = 'vigorous-device-warning-dismissed'

function shouldShowDeviceWarning() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches ?? false
  const touchCapable = navigator.maxTouchPoints > 0 || 'ontouchstart' in window
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  return coarsePointer || touchCapable || mobileUserAgent
}

function App() {
  const [showDeviceWarning, setShowDeviceWarning] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const dismissed = window.sessionStorage.getItem(DEVICE_WARNING_KEY) === '1'
    if (!dismissed && shouldShowDeviceWarning()) {
      setShowDeviceWarning(true)
    }
  }, [])

  const dismissDeviceWarning = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(DEVICE_WARNING_KEY, '1')
    }
    setShowDeviceWarning(false)
  }

  return (
    <div>
      <BrowserRouter>  {/* 1. 用这个标签包住整个网站 */}
        <div>
          {/* 2. 导航菜单 - 像饭店的菜单列表 */}
          <nav style={{ display: 'none' }}>
            <Link to="/menu">功能菜单</Link> |
            <Link to="/explorer-project">项目资源管理器</Link> |
            <Link to="/explorer-texture">纹理资源管理器</Link> |
            <Link to="/explorer-decoration">装饰资源管理器</Link> |
            <Link to="/explorer-templates">模板资源管理器</Link> |
            <Link to="/test">React Context 测试页面</Link>
          </nav>

          {/* 3. 路由规则 - 告诉 React 哪个地址显示哪个页面 */}
          <Routes>
            <Route path="/menu" element={<Home />} />
            <Route path="/explorer-project" element={<ExplorerProject />} />
            <Route path="/explorer-texture" element={<ExplorerTexture />} />
            <Route path="/explorer-decoration" element={<ExplorerDecoration />} />
            <Route path="/explorer-templates" element={<ExplorerTemplates />} />
            <Route path="/chess-editor/:id" element={<ChessEditor />} />
            <Route path="/project-editor/:id" element={<ProjectEditor />} />
            <Route path="/template-editor/:id" element={<TemplateEditor />} />
            <Route path="/test" element={<Test />} />
          </Routes>

          {showDeviceWarning && (
            <div className="device-warning-overlay" role="dialog" aria-modal="true" aria-labelledby="device-warning-title">
              <div className="device-warning-card">
                <div className="device-warning-badge">最佳体验提示</div>
                <h2 id="device-warning-title">建议使用电脑访问</h2>
                <p>
                  当前检测到你正在使用移动或触屏设备。这个网页的编辑和布尔运算功能更适合在电脑上操作，
                  可以获得更稳定的预览和更好的交互体验。
                </p>
                <button type="button" className="device-warning-button" onClick={dismissDeviceWarning}>
                  我知道了，继续浏览
                </button>
              </div>
            </div>
          )}
        </div>
      </BrowserRouter>
      <AppBottom />
    </div>
  );
}

export default App
