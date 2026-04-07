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

// 获取 CSRF token - 优先从 meta 标签读，再从 cookie 读
function getCSRFToken() {
  // 方式 1: 从 meta 标签读（Django 模板通常会在 <head> 中放置）
  const metaToken = document.querySelector('meta[name="csrf-token"]');
  if (metaToken && metaToken.content) {
    const token = metaToken.content.trim();
    if (token && token.length > 20) {
      return token;
    }
  }

  // 方式 2: 从 cookie 读
  const cookieToken = getCookie('csrftoken');
  if (cookieToken && cookieToken.length > 20) {
    return cookieToken;
  }

  // 都没拿到则返回 null
  return null;
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

// 请求拦截器 - 自动添加 CSRF token
csrfapi.interceptors.request.use(
  (config) => {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    } else {
      console.warn('[CSRF] No valid CSRF token found. This may cause POST requests to fail.');
    }

    // 如果是 FormData 且用户没有手动设置 Content-Type，让浏览器自动设置
    if (config.data instanceof FormData) {
      // 只有当用户没有显式设置 Content-Type 时才删除
      // 这样可以兼容手动设置的情况
      const userSetContentType = config.headers['Content-Type'] &&
        config.headers['Content-Type'] !== 'application/json';

      if (userSetContentType) {
        // 用户手动设置了（比如 multipart/form-data），保留
        // 但如果是完整的 multipart/form-data，需要删除让浏览器添加 boundary
        if (config.headers['Content-Type'] === 'multipart/form-data') {
          delete config.headers['Content-Type'];
        }
      } else {
        // 用户没设置，删除默认的 application/json
        delete config.headers['Content-Type'];
        delete config.headers['Accept'];
      }
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