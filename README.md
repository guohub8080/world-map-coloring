# 世界地图填色

一个基于 React + TypeScript + Vite 的世界地图填色工具：点击国家即可填色，支持多种投影、样式定制、ISO 代码 JSON 双向编辑与 SVG 导出。**地图边界遵循中国立场**。

## 功能

- **点击填色**：点选国家/地区填色，支持橡皮擦、撤销、清空；已着色列表实时管理
- **8 种地图投影**：自然地球、墨卡托、等距圆柱、罗宾逊、等积地球、圆锥等距、方位等距、艾里；中心经度（-180°~180°）与中心纬度（-80°~80°）均可调，圆锥投影标准纬线随中心纬度联动
- **样式定制**：陆地 / 海洋 / 边界颜色、边界粗细，一键恢复默认；shadcn 风格取色器（含透明度）
- **画布设置（所见即所得）**：画布尺寸（viewBox `0 0 w h`）、上下间距（viewBox 单位）实时作用于屏幕显示与导出结果，画布外区域以深色衬底显示真实大小
- **ISO-3 JSON 编辑器**：与填色数据双向绑定，可手动编辑（键支持 ISO-3 / ISO-2 / 中文名），非法输入红框报错且不破坏现有数据
- **导入 / 导出**：JSON 导入（合并 / 替换，支持任意 CSS 颜色值含透明度）、JSON/ISO 导出、SVG 导出（可带标题与图例）
- **移动端适配**：全屏地图 + 底部工具栏 + 底部弹出面板，双指捏合缩放、拖拽平移

## 地图数据（重要）

底图不是单一来源数据，而是两份公开数据拼合、再经几何处理的产物
（详见 `src/assets/README.md`）：

- **中国部分（唯一权威基准）**：阿里 DataV · GeoAtlas 中国全图，
  带自然资源部**审图号 GS京(2022)1061 号**，含台湾、藏南、钓鱼岛/赤尾屿、
  南海诸岛及十段线（GCJ-02 已转 WGS84）；
- **其他国家/地区**：Natural Earth（公有领域），仅负责"中国以外的世界"；
- **几何处理**：其他所有国家多边形均执行「该国 − 中国」difference 运算，
  中国审定边界内的区域已从别国挖除；藏南归中国、中不边界争议区归中国、
  科索沃并入塞尔维亚。处理后各国边界两两不重叠，主权归属在数据层固定，
  与渲染顺序和投影方式无关。

## 技术栈

- React 19 + TypeScript + Vite
- Tailwind CSS + shadcn/ui + react-colorful（取色器）
- jotai（atomWithStorage 状态持久化）
- d3-geo / d3-geo-projection（投影与 SVG 路径生成）
- @turf/rewind（球面多边形环绕方向校正）

## 本地开发

```bash
npm install
npm run dev      # 开发服务器
npm run build    # 构建到 dist/
npm run preview  # 预览构建产物
```

## 目录结构

```
src/
├── assets/          # 底图数据（world_cn.json / dashline.json）+ 数据说明
├── atoms/           # jotai 状态（填色、投影、样式、画布等）
├── components/      # Ribbon（PC 顶栏）、MobileChrome（移动端）、WorldMap、Sidebar 等
│   └── ui/          # shadcn 组件 + 自定义 ColorPicker
├── lib/             # projections（投影）、exportSvg（导出）、fillIO（导入解析）、worldData
└── hooks/
```
