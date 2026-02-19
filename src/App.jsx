/*
 * App.jsx
 * 这里是我们的主页面。
 */
import './App.css'
import Home from './Pages/home/home.jsx'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import ExplorerProject from './Pages/explorer_project/explorer_project.jsx'
import ExplorerTexture from './Pages/explorer_texture/explorer_texture.jsx'
import ExplorerTemplates from './Pages/explorer_templates/explorer_templates.jsx'
import ChessEditor from './Pages/chess_editor/chess_editor.jsx'
import Test from './Pages/test.jsx'
import AppBottom from './Components/Appbottom/Appbottom.jsx'

function App() {
  return (
    <div>
      <BrowserRouter>  {/* 1. 用这个标签包住整个网站 */}
        <div>
          {/* 2. 导航菜单 - 像饭店的菜单列表 */}
          <nav>
            <Link to="/">功能菜单</Link> | 
            <Link to="/explorer-project">项目资源管理器</Link> | 
            <Link to="/explorer-texture">贴图资源管理器</Link> | 
            <Link to="/explorer-templates">模板资源管理器</Link> | 
            <Link to="/chess-editor">棋子编辑器</Link> | 
            <Link to="/test">React Context测试页面</Link>
          </nav>

          {/* 3. 路由规则 - 告诉 React 哪个地址显示哪个页面 */}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explorer-project" element={<ExplorerProject />} />
            <Route path="/explorer-texture" element={<ExplorerTexture />} />
            <Route path="/explorer-templates" element={<ExplorerTemplates />} />
            <Route path="/chess-editor" element={<ChessEditor />} />
            <Route path="/test" element={<Test />} />
          </Routes>
        </div>
      </BrowserRouter>
      <AppBottom />
    </div>
  );
}

export default App