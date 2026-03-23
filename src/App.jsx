/*
 * App.jsx
 * 这里是我们的主页面。
 */
import './App.css'
import Home from './Pages/home/home.jsx'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import ExplorerProject from './Pages/explorer_project/explorer_project.jsx'
import ExplorerTexture from './Pages/explorer_texture/explorer_texture.jsx'
import ExplorerDecoration from './Pages/explorer_decoration/explorer_decoration.jsx'
import ExplorerTemplates from './Pages/explorer_templates/explorer_templates.jsx'
import ChessEditor from './Pages/chess_editor/chess_editor.jsx'
import ProjectEditor from './Pages/project_editor/ProjectEditor.jsx'
import Test from './Pages/test.jsx'

import AppBottom from './Components/Appbottom/Appbottom.jsx'

function App() {
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
            <Route path="/test" element={<Test />} />
          </Routes>
        </div>
      </BrowserRouter>
      <AppBottom />
    </div>
  );
}

export default App
