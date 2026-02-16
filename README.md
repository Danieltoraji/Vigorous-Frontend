# 衡有锦深！——3D部分源码
## 关于
- 这里将会是我们的Web3D部分的源代码。
- 我们的主项目中看到的Web3D部分其实是编译后的，因此需要将编译前的源代码开一个仓库，放在这里。
- 运行开发服务器，请使用npm run dev或者yarn dev。如果提示项目依赖没有安装，请运行`yarn install`或者`npm install`。
## 重要！暂定的后端返回数据
- A 使用一次请求，返回所有项目数据。
```jsx
{
    'Hajimi-123456': {
      name: 'Vigorous-Test-Project',
      user: 'Hajimi',
      created_at: 'date1',
      edited_at: 'date2',
      id: 'Hajimi-123456',
      description: 'Oiiaioiiiiai',
      status: 'editable',
      feature:{
        shape: 'square',
        size: 10,
      },
      project_tags: ['type1','type2'],
    },
    'Hajimi-456789': {
      name: 'Vigorous-Test-Project',
      user: 'Hajimi',
      created_at: 'date3',
      edited_at: 'date4',
      id: 'Hajimi-456789',
      description: '第二个测试项目',
      status: 'archived',
      feature:{
        shape: 'square',
        size: 10,
      },
      project_tags: ['type3','type4'],
    },
  }
```
## 前端项目架构
- 似乎除了src/目录下的文件都是自动生成的，我们只需要关注src/目录下的文件即可。
- src/目录下的文件主要包括：
  - App.jsx：主组件，通过路由包含了整个项目的结构，是整个项目的入口。App.css是它的配套样式文件。
  - Pages/：包含了项目的所有页面组件。
    - home.jsx: 功能菜单兼首页。
    - explorer_project.jsx: 项目资源管理器。
    - explorer_templates.jsx: 模板资源管理器。
    - explorer_texture.jsx: 贴图资源管理器。
  - Components/：包含了项目的所有**可复用**组件。**<u>不可复用的组件请存放在对应页面的文件夹下。</u>**
  - Contexts/：包含了项目的所有上下文（Context），是状态管理、信息交流的重要途径，也是未来和后端交互的重要接口。
    - UserContext.jsx: 用户上下文，用于存储和管理当前登录用户的用户层级的信息。比如：用户名，用户名下的项目清单。
    - ProjectContext.jsx: 项目上下文，用于存储和管理当前项目的信息。比如：项目名，项目下辖的棋子清单。
    - ChessContext.jsx: 棋子上下文，用于存储和管理当前棋子的信息。比如：棋子名，棋子的3D模型参数。

## 技术路线
- 我们使用的Web3D技术是Three.js。使用React框架构建前端。
- 我们使用React-three-fiber作为threejs的React渲染器。
- 使用Vite作为前端构建工具。在用来开发的电脑上，使用yarn进行包管理（当然我个人觉得npm也可以）。
## 本项目的创建、开发
- 本项目的创建依赖于以下命令：  `yarn create vite`
- 添加包：`yarn add three @types/three @react-three/fiber`
- 运行本地开发服务器，请在vite-project使用`yarn dev`
## 和主项目的关系
- 和一般的React项目一样，本项目在交付生产时要进行打包。`yarn run build`
- 打包后生成的静态文件将会被拷贝到主项目的/static文件夹中，再从其他.html文件中进行引用，在urls.py，views.py中进行路由与视图的配置。
- 打包和同步到主项目的过程，似乎可以由钉小呆来干...？
- **祝开发愉快！**
## 重要！React Context
- React Context 是 React 提供的一种状态管理机制，用于在组件树中共享数据。它可以避免 props 层层传递的问题，同时也可以实现组件之间的解耦。这是我们主要使用的数据传递机制，也是和后端交互的重要接口。
- React Context 主要包括两个部分：Context Provider 和 Context Consumer。
  - Context Provider 是一个组件，它负责提供数据给组件树中的所有子组件。
  - Context Consumer 是一个组件，它负责从 Context Provider 中获取数据并使用它。
- 我们在 Contexts/ 目录下定义了三个 Context：UserContext.jsx, ProjectContext.jsx, ChessContext.jsx。
  - UserContext.jsx 负责管理当前登录用户的用户层级的信息。
  - ProjectContext.jsx 负责管理当前项目的信息。
  - ChessContext.jsx 负责管理当前棋子的信息。
- 在Context文件中，我们需要定义每个Context的初始值和更新函数。
定义的模板如下：
```jsx
import { createContext, useState } from 'react'

const ChessContext = createContext(null)

export function ChessContextProvider({ children }) {
  const [chessData, setChessData] = useState({
    id: '111'
    ......
    tags: ['测试类别1', '测试类别2'],
  })
  return (
    <ChessContext.Provider value={{ chessData, setChessData }}>
      {children}
    </ChessContext.Provider>
  )
}
export { ChessContext }
```

使用方法：
```jsx
import { useContext } from 'react'
import { UserContext } from '../contexts/UserContext.jsx'

function Explorer_templates() {
  const { userData } = useContext(UserContext)
  return(
      <p>当前用户：{userData.username}</p>
  )
}
export default Explorer_templates
```
**注意**
- 在20260215更新中，我们采用了Hook的方式来定义Context，这是React推荐的方式。
- 以后在使用Context时，建议使用Hook的方式来获取Context值，而不是使用Context.Consumer。
- 示例代码：
```jsx
import { useProject } from '../../hooks/useProject.jsx'
function AAA(){
  const projects = userData.projects.map(projectId => {
    // 根据 projectId 从 ProjectContext 获取详细信息
    return projectData[projectId] || {
      // 在这里写：无返回的默认值时，返回的对象
    }
  })

  return(
    <p>当前项目：{currentProject.name}</p>
  )
}
```