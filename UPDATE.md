# 这个更新刚刚做了什么

## ***重要：这个分支的项目只有在打包到Django中后才能正常显示！将react项目目录放到Django目录下，然后yarn run build即可***

## 1. 打包路径
- 在vite.config.js中稍微调整了打包路径，纯粹是方便调试，若需要可以把新路径删掉

## 2. 用户信息前向传递
- 为useJser.jsx添加了一个api，当打包置于django中后，可以获取用户id和用户名了
- 从而能正常获取用户的项目列表并显示

## 3. 用户CSRF Token传递
- 由于django的设置，需要将csrf_token传递给后端认证，才能正常进行post、patch等请求
- 因此，使用axios拦截请求，将csrf_token添加到请求头中，才能正常请求api
- 若需要请 `yarn add axios`

## 4. 项目信息
- 现在可以正常新建、修改、删除项目了