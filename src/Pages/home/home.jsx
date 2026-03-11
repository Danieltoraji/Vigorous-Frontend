import { useUser } from '../../hooks/useUser.jsx';
import { Link } from 'react-router-dom';
import './home.css';

function Home() {
  const { userData } = useUser();

  const handleQuickAction = (action) => {
    // TODO: 实现快捷操作功能
  };

  return (
    <div className="home-container">
      {/* 头部 */}
      <header className="home-header">
        <h1>功能菜单</h1>
        <p>欢迎您！{userData.username}</p>
      </header>

      <div className="home-content">
        {/* 左侧导航 */}
        <aside className="home-sidebar">
          <nav className="sidebar-nav">
            <Link to="/menu" className="nav-item active">
              功能菜单
            </Link>
            <Link to="/explorer-project" className="nav-item">
              项目资源管理器
            </Link>
            <Link to="/explorer-texture" className="nav-item">
              贴图资源管理器
            </Link>
            <Link to="/explorer-templates" className="nav-item">
              模板资源管理器
            </Link>
            <Link to="/explorer-decoration" className="nav-item">
              装饰资源管理器
            </Link>
          </nav>
        </aside>

        {/* 中间内容 */}
        <main className="home-main">
          <div className="quick-actions">
            <h2>快捷操作</h2>
            <div className="action-buttons">
              <button
                className="action-btn"
                onClick={() => handleQuickAction('新建项目')}
              >
                新建项目
              </button>
              <button
                className="action-btn"
                onClick={() => handleQuickAction('导出项目')}
              >
                导出项目
              </button>
              <button
                className="action-btn"
                onClick={() => handleQuickAction('上传模板')}
              >
                上传模板
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Home;