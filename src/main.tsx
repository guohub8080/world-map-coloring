import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { ensureWorldDataLoaded } from './lib/worldData'

// 先加载地图数据（运行时从 public/data 拉取），加载完再渲染
ensureWorldDataLoaded()
  .then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StrictMode>,
    )
  })
  .catch((err) => {
    console.error('地图数据加载失败:', err)
    document.getElementById('root')!.innerHTML =
      '<div style="padding:24px;font-family:sans-serif">地图数据加载失败，请检查网络后刷新。</div>'
  })
