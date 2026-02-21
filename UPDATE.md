# 这个更新刚刚做了什么

## 1. 打包路径
- 在vite.config.js中稍微调整了打包路径，纯粹是方便调试，若需要可以把新路径删掉

## 2. 用户信息前向传递
- 为useJser.jsx添加了一个api，当打包置于django中后，可以获取用户id和用户名了
- 从而能正常获取用户的项目列表并显示

## 3. 用户CSRF Token传递
- 由于django的设置，需要将csrf_token传递给后端认证，才能正常进行post、patch等请求
- 因此，需要使用axios拦截请求，将csrf_token添加到请求头中，才能正常请求api
- `yarn add axios`

## 4. 更新项目信息
- 把`useProject`的`updateProject`方法，添加进了提交“编辑项目信息”表单的行为中