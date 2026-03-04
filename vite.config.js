import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 以后你在 React 里写 fetch('/api/...')
      // Vite 会自动把它转发到 http://localhost:8000/api/...，打包前后就不用改代码了
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }

    }
  },
  // 以下内容有必要可以删掉，只是为了方便测试
  build: {
    emptyOutDir: false,
    outDir: '../web3d',// 把整个react文件夹放到原django文件夹下，这样打包时就会自动与后端合并了
    rollupOptions: {
      output: {
        entryFileNames: 'static/web3d/js/[name].js',
        chunkFileNames: 'static/web3d/js/[name].js',
        assetFileNames: 'static/web3d/[ext]/[name].[ext]'
      }
    },
  }
})
