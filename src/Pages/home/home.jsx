import { useUser } from '../../hooks/useUser.jsx';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './home.css';

function Home() {
  const { userData } = useUser();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [hoveredButton, setHoveredButton] = useState(null);

  // 实现背景视差效果
  useEffect(() => {
    const handleMouseMove = (e) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // 计算鼠标位置相对于窗口中心的偏移
      const xOffset = -(mouseX - window.innerWidth / 2) / 100;
      const yOffset = -(mouseY - window.innerHeight / 2) / 100;

      setMousePosition({ x: xOffset, y: yOffset });
      setTooltipPosition({ x: mouseX, y: mouseY });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // 按钮提示信息映射
  const buttonTooltips = {
    'project-btn': '看看我有什么项目...？',
    'texture-btn': '看看我导入了什么材质...？',
    'decoration-btn': '看看我上传了什么装饰...？',
    'templates-btn': '看看有什么现成的模板...？'
  };

  const handleMouseEnter = (buttonClass) => {
    setHoveredButton(buttonClass);
  };

  const handleMouseLeave = () => {
    setHoveredButton(null);
  };

  return (
    <div className="home-container">
      {/* 背景层 - 视差效果 */}
      <div
        className="background-layer"
        style={{
          transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`
        }}
      />

      {/* 头部 */}
      <header className="home-header">
        <h1 className='header-title'>功能菜单</h1>
        <p className='user-welcome'>欢迎您！{userData.username}</p>
      </header>
      <div className='home-container'>
        <Link
          to="/explorer-project"
          className="nav-item project-btn"
          onMouseEnter={() => handleMouseEnter('project-btn')}
          onMouseLeave={handleMouseLeave}
        />
        <Link
          to="/explorer-texture"
          className="nav-item texture-btn"
          onMouseEnter={() => handleMouseEnter('texture-btn')}
          onMouseLeave={handleMouseLeave}
        />
        <Link
          to="/explorer-decoration"
          className="nav-item decoration-btn"
          onMouseEnter={() => handleMouseEnter('decoration-btn')}
          onMouseLeave={handleMouseLeave}
        />
        <Link
          to="/explorer-templates"
          className="nav-item templates-btn"
          onMouseEnter={() => handleMouseEnter('templates-btn')}
          onMouseLeave={handleMouseLeave}
        />
      </div>

      {/* 跟随鼠标的提示框 */}
      {hoveredButton && (
        <div
          className="tooltip-following"
          style={{
            left: `${tooltipPosition.x + 15}px`,
            top: `${tooltipPosition.y + 15}px`
          }}
        >
          {buttonTooltips[hoveredButton]}
        </div>
      )}

      <div class="footer">2026 衡有锦深</div>
    </div>
  );
}

export default Home;