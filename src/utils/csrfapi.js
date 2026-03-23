import axios from 'axios';

// 获取CSRF token的函数
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// 创建 axios 实例
const csrfapi = axios.create({
  baseURL: '/api',
  timeout: 300000, // 五分钟超时，适用于 AI 生成等耗时操作
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
});

// 请求拦截器 - 自动添加CSRF token
csrfapi.interceptors.request.use(
  (config) => {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 统一错误处理
csrfapi.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API请求失败:', error);
    return Promise.reject(error);
  }
);

export default csrfapi;