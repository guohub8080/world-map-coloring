import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { ensureWorldDataLoaded } from './lib/worldData'

const rootEl = document.getElementById('root')!

function renderApp() {
  createRoot(rootEl).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
}

function renderError(message: string) {
  // 内联样式，不依赖外部 CSS 是否已加载
  rootEl.innerHTML = `
    <div style="position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#0a0a0a;color:#a3a3a3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei',sans-serif;padding:24px;text-align:center">
      <div style="font-size:16px">${message}</div>
      <button id="wmf-retry" style="padding:8px 20px;border:1px solid #525252;border-radius:6px;background:transparent;color:#d4d4d4;cursor:pointer;font-size:14px">重试</button>
    </div>`
  document.getElementById('wmf-retry')?.addEventListener('click', () => location.reload())
}

// 先加载地图数据（运行时从 public/data 拉取），加载完再渲染
ensureWorldDataLoaded().then(renderApp).catch((err) => {
  console.error('地图数据加载失败:', err)
  renderError('地图数据加载失败，请检查网络连接。')
})
