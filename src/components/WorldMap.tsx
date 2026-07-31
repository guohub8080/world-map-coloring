import { memo, useMemo, useRef, useState, useCallback, useEffect } from "react";
import { geoPath } from "d3-geo";
import { useAtomValue, useSetAtom } from "jotai";
import { worldFeatures, dashFeatures, worldFeatureCollection } from "../lib/worldData";
import { getProjection } from "../lib/projections";
import {
  fillsAtom, applyFillAtom, projectionIdAtom, centerLonAtom, centerLatAtom,
  exportWidthAtom, exportHeightAtom, exportPaddingAtom,
  landColorAtom, seaColorAtom, borderColorAtom, borderWidthAtom, eraserAtom,
} from "../atoms/mapAtoms";
import { useIsMobile } from "../hooks/useIsMobile";

interface View { x: number; y: number; k: number }

interface CountryPathProps {
  name: string;
  fullName: string;
  d: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  hovered: boolean;
  hoverColor: string;
  onPointerDown: (e: React.PointerEvent, name: string) => void;
  onMouseEnter: (e: React.MouseEvent, fullName: string) => void;
  onMouseLeave: () => void;
  onClick: (name: string) => void;
}

/**
 * 单个国家 path，用 memo 包裹：只有自身 props 变化才重渲染。
 * 每个 path 自带 stroke/strokeWidth（与导出 SVG 一致，便于编辑）。
 * 去掉 transition-colors——否则改颜色时 200+ path 同时触发 CSS 过渡动画导致卡顿。
 */
const CountryPath = memo(function CountryPath({
  name, fullName, d, fill, stroke, strokeWidth, hovered, hoverColor,
  onPointerDown, onMouseEnter, onMouseLeave, onClick,
}: CountryPathProps) {
  return (
    <path
      d={d}
      fill={hovered ? hoverColor : fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      className="cursor-pointer"
      onPointerDown={(e) => onPointerDown(e, name)}
      onMouseEnter={(e) => onMouseEnter(e, fullName)}
      onMouseLeave={onMouseLeave}
      onClick={() => onClick(name)}
    />
  );
});

export default function WorldMap() {
  const fills = useAtomValue(fillsAtom);
  const applyFill = useSetAtom(applyFillAtom);
  const projectionId = useAtomValue(projectionIdAtom);
  const centerLon = useAtomValue(centerLonAtom);
  const centerLat = useAtomValue(centerLatAtom);
  const exportW = useAtomValue(exportWidthAtom);
  const exportH = useAtomValue(exportHeightAtom);
  const exportPad = useAtomValue(exportPaddingAtom);
  const defaultColor = useAtomValue(landColorAtom);
  const seaColor = useAtomValue(seaColorAtom);
  const borderColor = useAtomValue(borderColorAtom);
  const borderWidth = useAtomValue(borderWidthAtom);
  const eraser = useAtomValue(eraserAtom);
  const isMobile = useIsMobile();

  const hoverColor = eraser ? "#fecaca" : "#fde68a";

  const paths = useMemo(() => {
    // SVG 渲染管线（形变只来自投影算法本身，其余环节全部等比）：
    // 1) 投影：geoProjection.rotate 先对球面做旋转（中心经纬度），再把球面
    //    经纬度映射为平面坐标——先转球、后投影，旋转本身不产生拉伸；
    // 2) 自适应缩放：fitExtent 自动计算 scale/translate，x/y 永远同一比例
    //    （各向同性），把整幅地图等比装进 1600×900 画布并留 10px 边距；
    // 3) 显示层：SVG viewBox + preserveAspectRatio 锁定宽高比——桌面 "meet"
    //    完整显示（留白），移动端 "slice" 全屏铺满（裁掉溢出边缘），只裁不切；
    // 4) 球面环绕方向已在 worldData.prepare 中统一（d3 球面填充规则），
    //    避免跨 180° 经线的多边形被反向填充（否则会出现"包住全球"的诡异形变）。
    // 屏幕画布 = 导出 viewBox：尺寸、留白完全一致，所见即所得
    const W = Math.max(100, Math.round(exportW));
    const H = Math.max(100, Math.round(exportH));
    const pad = Math.min(Math.max(0, exportPad), Math.min(W, H) / 2 - 1);
    const projection = getProjection(projectionId).create(centerLon, centerLat).fitExtent(
      [[pad, pad], [W - pad, H - pad]],
      worldFeatureCollection
    );
    const pathGen = geoPath(projection);
    return {
      countries: worldFeatures.map((f) => ({
        name: f.properties.name,
        fullName: f.properties.full_name || f.properties.name,
        d: pathGen(f as unknown as GeoJSON.Feature) || "",
      })),
      dashes: dashFeatures.map((f) => pathGen(f as unknown as GeoJSON.Feature) || ""),
    };
  }, [projectionId, centerLon, centerLat, exportW, exportH, exportPad]);

  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const svgRef = useRef<SVGSVGElement>(null);

  // 指针拖拽（鼠标 + 触屏统一用 Pointer Events）
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragStart = useRef<{ x: number; y: number; view: View } | null>(null);
  const pinchStart = useRef<{ dist: number; k: number } | null>(null);
  // 触屏点按填色：记录按下位置，抬起时位移小则视为点击
  const tapStart = useRef<{ x: number; y: number; name: string } | null>(null);

  // 切换投影或中心时复位视图
  useEffect(() => setView({ x: 0, y: 0, k: 1 }), [projectionId, centerLon]);

  // 移动端 slice 铺满屏，允许缩得更小以便看到完整世界
  const minK = isMobile ? 0.25 : 0.8;
  const clampK = (k: number) => Math.min(12, Math.max(minK, k));

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setView((v) => ({ ...v, k: clampK(v.k * (e.deltaY < 0 ? 1.15 : 1 / 1.15)) }));
  }, []);

  const getPointer = (e: React.PointerEvent) => ({ x: e.clientX, y: e.clientY });

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, getPointer(e));
    if (pointers.current.size === 1) {
      dragStart.current = { x: e.clientX, y: e.clientY, view };
      pinchStart.current = null;
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), k: view.k };
      dragStart.current = null;
      tapStart.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, getPointer(e));

    if (pointers.current.size === 2 && pinchStart.current) {
      // 双指捏合缩放（捕获快照，避免 updater 延迟执行时 ref 已被置空）
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const ps = pinchStart.current;
      if (ps.dist > 0) {
        setView((v) => ({ ...v, k: clampK(ps.k * (dist / ps.dist)) }));
      }
      return;
    }
    const start = dragStart.current;
    if (start) {
      const rect = svgRef.current?.getBoundingClientRect();
      const scale = rect ? Math.max(100, Math.round(exportW)) / rect.width : 1;
      // 用局部快照 start，不直接读 ref（ref 可能在 updater 执行前被 pointerup 置空）
      setView(() => ({
        k: start.view.k,
        x: start.view.x + (e.clientX - start.x) * scale,
        y: start.view.y + (e.clientY - start.y) * scale,
      }));
    }
    // 桌面悬停 tooltip
    if (e.pointerType === "mouse") {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect && hovered) {
        setTooltip({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 12, text: hovered });
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    dragStart.current = null;
    // 触屏点按填色
    if (tapStart.current && e.pointerType !== "mouse") {
      const dx = e.clientX - tapStart.current.x;
      const dy = e.clientY - tapStart.current.y;
      if (Math.hypot(dx, dy) < 10) {
        applyFill(tapStart.current.name);
      }
      tapStart.current = null;
    }
  };

  const onCountryPointerDown = useCallback((e: React.PointerEvent, name: string) => {
    if (e.pointerType !== "mouse") {
      tapStart.current = { x: e.clientX, y: e.clientY, name };
    }
  }, []);

  // 稳定的事件处理器（useCallback 保证引用不变，CountryPath 的 memo 才有效）
  const onCountryMouseEnter = useCallback((e: React.MouseEvent, fullName: string) => {
    setHovered(fullName);
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) setTooltip({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 12, text: fullName });
  }, []);
  const onCountryMouseLeave = useCallback(() => {
    setHovered(null);
    setTooltip(null);
  }, []);
  const onCountryClick = useCallback((name: string) => applyFill(name), [applyFill]);

  // 屏幕显示与导出画布完全一致：SVG 元素本身即导出画布（viewBox 0 0 W H），
  // 画布以外区域用深色衬底（letterbox），体现真实的导出尺寸与比例
  const W = Math.max(100, Math.round(exportW));
  const H = Math.max(100, Math.round(exportH));

  return (
    <div className="relative w-full h-full overflow-hidden bg-neutral-800">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full select-none cursor-grab active:cursor-grabbing"
        style={{ touchAction: "none" }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseLeave={() => {
          setHovered(null);
          setTooltip(null);
        }}
      >
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {/* 海洋底色：只覆盖画布（viewBox）本身，随缩放平移一起移动；画布外信箱区保持深色 */}
          <rect x={0} y={0} width={W} height={H} fill={seaColor} />
          {paths.countries.map((p) => (
            <CountryPath
              key={p.name}
              name={p.name}
              fullName={p.fullName}
              d={p.d}
              fill={fills[p.name] || defaultColor}
              stroke={borderColor}
              strokeWidth={borderWidth / view.k}
              hovered={hovered === p.fullName}
              hoverColor={hoverColor}
              onPointerDown={onCountryPointerDown}
              onMouseEnter={onCountryMouseEnter}
              onMouseLeave={onCountryMouseLeave}
              onClick={onCountryClick}
            />
          ))}
          {/* 南海十段线（不可填色，随边界色绘制） */}
          {paths.dashes.map((d, i) => (
            <path key={`dash-${i}`} d={d} fill={borderColor} stroke="none" pointerEvents="none" />
          ))}
        </g>
      </svg>
      {/* 画布尺寸角标 */}
      <div className="absolute top-2 right-2 pointer-events-none bg-black/60 text-white/90 text-[11px] font-mono px-2 py-1 rounded-md z-10">
        {W} × {H}
      </div>
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-black/75 text-white text-sm px-2 py-1 rounded-md z-10 whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
      <div className={`absolute right-3 flex flex-col gap-1 ${isMobile ? "bottom-[4.5rem]" : "bottom-3"}`}>
        <button
          className="w-8 h-8 bg-background rounded-md shadow border text-lg leading-none hover:bg-accent"
          onClick={() => setView((v) => ({ ...v, k: clampK(v.k * 1.3) }))}
        >
          +
        </button>
        <button
          className="w-8 h-8 bg-background rounded-md shadow border text-lg leading-none hover:bg-accent"
          onClick={() => setView((v) => ({ ...v, k: clampK(v.k / 1.3) }))}
        >
          −
        </button>
        <button
          className="w-8 h-8 bg-background rounded-md shadow border text-xs leading-none hover:bg-accent"
          onClick={() => setView({ x: 0, y: 0, k: 1 })}
          title="复位视图"
        >
          ⌂
        </button>
      </div>
    </div>
  );
}
