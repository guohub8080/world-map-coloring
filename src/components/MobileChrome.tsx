import { useEffect, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  fillsAtom, currentColorAtom, eraserAtom, undoAtom, historyAtom,
  clearAllAtom, mapTitleAtom, withLegendAtom, projectionIdAtom, centerLonAtom, centerLatAtom, resetCenterAtom,
  exportWidthAtom, exportHeightAtom, exportPaddingAtom,
  landColorAtom, seaColorAtom, borderColorAtom, borderWidthAtom, dashColorAtom, dashWidthAtom, filledEntriesAtom,
} from "../atoms/mapAtoms";
import { buildSvgString, downloadSvg } from "../lib/exportSvg";
import { fillsToJson, fillsToIsoObject, downloadJson } from "../lib/fillIO";
import { PROJECTIONS, CENTER_PRESETS } from "../lib/projections";
import { PRESET_COLORS } from "./ColorPalette";
import { ColorPicker } from "@/components/ui/color-picker";
import CenterLonSlider, { CenterLatSlider } from "./CenterLonSlider";
import { SidebarBody } from "./Sidebar";
import { StyleFields } from "./StylePanel";
import { ImportForm } from "./ImportPanel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Eraser, Undo2, ListTree, Globe2, SlidersHorizontal, FileDown, Check, RotateCcw,
} from "lucide-react";

type SheetKey = "color" | "list" | "proj" | "style" | "data";

const SHEET_TITLES: Record<SheetKey, string> = {
  color: "选择颜色",
  list: "已着色国家 / ISO-3 JSON",
  proj: "投影与中心经度",
  style: "样式设置",
  data: "数据：导入 / 导出",
};

function ProjectionSheet() {
  const [projectionId, setProjectionId] = useAtom(projectionIdAtom);
  const [centerLon, setCenterLon] = useAtom(centerLonAtom);
  const resetCenter = useSetAtom(resetCenterAtom);
  const isPreset = CENTER_PRESETS.some((p) => p.value === centerLon);

  return (
    <div className="space-y-5 px-4 pb-4">
      <div className="space-y-2">
        <Label>地图投影</Label>
        <Select value={projectionId} onValueChange={setProjectionId}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PROJECTIONS.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>中心经度</Label>
        <Select
          value={isPreset ? String(centerLon) : "custom"}
          onValueChange={(v) => {
            if (v !== "custom") setCenterLon(Number(v));
          }}
        >
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CENTER_PRESETS.map((p) => (
              <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
            ))}
            <SelectItem value="custom">自定义经度</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>微调经度（-180° ~ 180°）</Label>
        <CenterLonSlider sliderClass="flex-1" />
      </div>
      <div className="space-y-2">
        <Label>中心纬度（-80° ~ 80°，圆锥投影联动标准纬线）</Label>
        <CenterLatSlider sliderClass="flex-1" />
      </div>
      <Button variant="outline" size="sm" className="w-full" onClick={resetCenter}>
        <RotateCcw className="size-3.5" />
        重置经纬度（105°E / 0°）
      </Button>
    </div>
  );
}

/** 画布尺寸/间距输入（移动端） */
function MobileSizeInput({
  value, onChange, label, min = 100, max = 8000,
}: { value: number; onChange: (v: number) => void; label: string; min?: number; max?: number }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = (raw: string) => {
    const v = Number(raw);
    if (raw.trim() === "" || isNaN(v)) { setText(String(value)); return; }
    const clamped = Math.min(max, Math.max(min, Math.round(v)));
    setText(String(clamped));
    if (clamped !== value) onChange(clamped);
  };
  return (
    <Input
      className="flex-1 text-right font-mono"
      inputMode="numeric"
      title={`${label}（${min} ~ ${max}）`}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const v = Number(e.target.value);
        if (e.target.value.trim() !== "" && !isNaN(v) && v >= min && v <= max) onChange(Math.round(v));
      }}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && commit((e.target as HTMLInputElement).value)}
    />
  );
}

function DataSheet({ close }: { close: () => void }) {
  const fills = useAtomValue(fillsAtom);
  const hasFills = Object.keys(fills).length > 0;
  const [mapTitle, setMapTitle] = useAtom(mapTitleAtom);
  const [withLegend, setWithLegend] = useAtom(withLegendAtom);
  const projectionId = useAtomValue(projectionIdAtom);
  const centerLon = useAtomValue(centerLonAtom);
  const centerLat = useAtomValue(centerLatAtom);
  const landColor = useAtomValue(landColorAtom);
  const seaColor = useAtomValue(seaColorAtom);
  const borderColor = useAtomValue(borderColorAtom);
  const borderWidth = useAtomValue(borderWidthAtom);
  const dashColor = useAtomValue(dashColorAtom);
  const dashWidth = useAtomValue(dashWidthAtom);
  const clearAll = useSetAtom(clearAllAtom);
  const [exportW, setExportW] = useAtom(exportWidthAtom);
  const [exportH, setExportH] = useAtom(exportHeightAtom);
  const [exportPad, setExportPad] = useAtom(exportPaddingAtom);

  const exportSvg = () => {
    const svg = buildSvgString({
      fills, projectionId, centerLon, centerLat,
      defaultColor: landColor, borderColor, borderWidth, dashColor, dashWidth, seaColor,
      title: mapTitle.trim() || undefined,
      showLegend: withLegend,
      width: exportW, height: exportH, padding: exportPad,
    });
    downloadSvg(svg, `${mapTitle.trim() || "世界地图填色"}.svg`);
  };

  return (
    <div className="space-y-3 px-4 pb-4">
      <div className="space-y-2">
        <Label>地图标题（可选）</Label>
        <Input value={mapTitle} onChange={(e) => setMapTitle(e.target.value)} placeholder="导出 SVG 时显示" />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="m-legend" checked={withLegend} onCheckedChange={(v) => setWithLegend(v === true)} />
        <Label htmlFor="m-legend" className="font-normal cursor-pointer">导出含图例</Label>
      </div>
      <div className="space-y-2">
        <Label>画布尺寸（viewBox="0 0 {exportW} {exportH}"，屏幕所见即导出）</Label>
        <div className="flex items-center gap-2">
          <MobileSizeInput value={exportW} onChange={setExportW} label="宽" />
          <span className="text-muted-foreground text-sm">×</span>
          <MobileSizeInput value={exportH} onChange={setExportH} label="高" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>上下间距（viewBox 单位）</Label>
        <MobileSizeInput value={exportPad} onChange={setExportPad} label="间距" min={0} max={400} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button onClick={exportSvg}>导出 SVG</Button>
        <Button variant="outline" disabled={!hasFills}
          onClick={() => downloadJson(fillsToJson(fills), "填色配置.json")}>
          导出 JSON
        </Button>
        <Button variant="outline" disabled={!hasFills}
          onClick={() => downloadJson(JSON.stringify(fillsToIsoObject(fills), null, 2), "填色配置-ISO.json")}>
          导出 ISO
        </Button>
      </div>
      <Separator />
      <p className="text-sm font-medium">导入填色（键支持中文名 / ISO 代码，颜色支持任意 CSS 值含透明度）</p>
      <ImportForm onDone={close} />
      <Separator />
      <Button variant="destructive" className="w-full" disabled={!hasFills}
        onClick={() => { clearAll(); close(); }}>
        清空全部填色
      </Button>
    </div>
  );
}

/** 颜色面板：大网格点选 + 自定义取色器 */
function ColorSheet({ currentColor, onPick }: { currentColor: string; onPick: (c: string) => void }) {
  return (
    <div className="px-4 pb-4 space-y-4">
      <div className="grid grid-cols-6 gap-3">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            className={cn(
              "aspect-square rounded-xl flex items-center justify-center ring-2 ring-offset-2 transition-transform active:scale-95",
              currentColor === c ? "ring-gray-800" : "ring-transparent border border-black/10"
            )}
            style={{ background: c }}
            onClick={() => onPick(c)}
          >
            {currentColor === c && <Check className="size-5 text-white drop-shadow" />}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-xl border px-4 py-3">
        <span className="text-sm">自定义颜色（含透明度）</span>
        <ColorPicker value={currentColor} onChange={onPick} className="w-10 h-10 rounded-lg" />
      </div>
    </div>
  );
}

export default function MobileChrome() {
  const [sheet, setSheet] = useState<SheetKey | null>(null);
  const [currentColor, setCurrentColor] = useAtom(currentColorAtom);
  const [eraser, setEraser] = useAtom(eraserAtom);
  const undo = useSetAtom(undoAtom);
  const canUndo = useAtomValue(historyAtom).length > 0;
  const entries = useAtomValue(filledEntriesAtom);

  const pick = (c: string) => {
    setCurrentColor(c);
    setEraser(false);
  };

  const tabs: { key: SheetKey; label: string; icon: React.ReactNode }[] = [
    { key: "list", label: `列表${entries.length ? ` ${entries.length}` : ""}`, icon: <ListTree className="size-4" /> },
    { key: "proj", label: "投影", icon: <Globe2 className="size-4" /> },
    { key: "style", label: "样式", icon: <SlidersHorizontal className="size-4" /> },
    { key: "data", label: "数据", icon: <FileDown className="size-4" /> },
  ];

  return (
    <>
      {/* 底部栏：当前颜色 + 编辑 + 功能图标 */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 bg-background/95 backdrop-blur border-t"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center h-14 px-3 gap-2.5">
          {/* 当前颜色：点开颜色面板 */}
          <button
            className="flex items-center gap-2 shrink-0 rounded-full border pl-1 pr-3 h-10 active:bg-accent"
            onClick={() => setSheet("color")}
          >
            <span
              className="w-8 h-8 rounded-full border border-black/10"
              style={{ background: eraser ? "repeating-conic-gradient(#f87171 0% 25%, #fff 0% 50%) 0 0/10px 10px" : currentColor }}
            />
            <span className="text-xs text-muted-foreground">{eraser ? "橡皮擦" : "颜色"}</span>
          </button>

          {/* 橡皮擦 + 撤销 */}
          <button
            className={cn(
              "w-10 h-10 rounded-full shrink-0 flex items-center justify-center border",
              eraser ? "bg-primary text-primary-foreground border-primary" : "bg-background"
            )}
            onClick={() => setEraser(!eraser)}
            title="橡皮擦"
          >
            <Eraser className="size-4" />
          </button>
          <button
            className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center border bg-background disabled:opacity-40"
            onClick={undo}
            disabled={!canUndo}
            title="撤销"
          >
            <Undo2 className="size-4" />
          </button>

          <div className="flex-1" />

          {/* 标签：纯图标按钮 */}
          {tabs.map((t) => (
            <button
              key={t.key}
              className={cn(
                "flex items-center justify-center shrink-0 w-10 h-10 rounded-lg text-muted-foreground",
                sheet === t.key && "bg-accent text-foreground"
              )}
              title={t.label}
              onClick={() => setSheet(sheet === t.key ? null : t.key)}
            >
              {t.icon}
            </button>
          ))}
        </div>
      </div>

      {/* 底部抽屉 */}
      <Sheet open={sheet !== null} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="max-h-[80vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>{sheet ? SHEET_TITLES[sheet] : ""}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {sheet === "color" && (
              <ColorSheet
                currentColor={currentColor}
                onPick={(c) => {
                  pick(c);
                  setSheet(null);
                }}
              />
            )}
            {sheet === "list" && (
              <div className="flex flex-col h-full"><SidebarBody /></div>
            )}
            {sheet === "proj" && <ProjectionSheet />}
            {sheet === "style" && (
              <div className="px-4 pb-4"><StyleFields sliderClass="flex-1" stack /></div>
            )}
            {sheet === "data" && <DataSheet close={() => setSheet(null)} />}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
