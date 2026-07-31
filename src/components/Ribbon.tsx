import { useEffect, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  eraserAtom, undoAtom, clearAllAtom, historyAtom, fillsAtom,
  mapTitleAtom, withLegendAtom, projectionIdAtom, centerLonAtom, centerLatAtom, resetCenterAtom,
  exportWidthAtom, exportHeightAtom, exportPaddingAtom,
  landColorAtom, seaColorAtom, borderColorAtom, borderWidthAtom,
  showImportAtom,
} from "../atoms/mapAtoms";
import { buildSvgString, downloadSvg } from "../lib/exportSvg";
import { fillsToJson, fillsToIsoObject, downloadJson } from "../lib/fillIO";
import { PROJECTIONS, CENTER_PRESETS } from "../lib/projections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Eraser, Undo2, Trash2, FileDown, FileCode2, Globe2, Braces, RotateCcw,
} from "lucide-react";
import ColorPalette from "./ColorPalette";
import CenterLonSlider, { CenterLatSlider } from "./CenterLonSlider";
import { LandField, SeaField, BorderField, StyleBorderField, StyleResetButton } from "./StylePanel";
import { ImportForm } from "./ImportPanel";
import { cn } from "@/lib/utils";

type TabKey = "map" | "fill" | "style" | "data";

const TABS: { key: TabKey; label: string }[] = [
  { key: "map", label: "地图" },
  { key: "fill", label: "填色" },
  { key: "style", label: "样式" },
  { key: "data", label: "数据" },
];

/** 分组间分隔线 */
const Sep = () => <span className="self-stretch w-px bg-border mx-1 shrink-0" aria-hidden />;

/** 控件 + 下方小标签（不占整行） */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2">
      {children}
      <span className="mt-1 text-[10px] leading-none text-muted-foreground">{label}</span>
    </div>
  );
}

function MapTab() {
  const [projectionId, setProjectionId] = useAtom(projectionIdAtom);
  const [centerLon, setCenterLon] = useAtom(centerLonAtom);
  const resetCenter = useSetAtom(resetCenterAtom);
  const isPreset = CENTER_PRESETS.some((p) => p.value === centerLon);

  return (
    <>
      <Field label="投影方式">
        <Select value={projectionId} onValueChange={setProjectionId}>
          <SelectTrigger className="w-48 h-8"><SelectValue className="truncate" /></SelectTrigger>
          <SelectContent>
            {PROJECTIONS.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Sep />
      <Field label="中心经度预设">
        <Select
          value={isPreset ? String(centerLon) : "custom"}
          onValueChange={(v) => { if (v !== "custom") setCenterLon(Number(v)); }}
        >
          <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CENTER_PRESETS.map((p) => (
              <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
            ))}
            <SelectItem value="custom">自定义经度</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Sep />
      <Field label="经度微调（-180° ~ 180°）">
        <CenterLonSlider sliderClass="w-40" />
      </Field>
      <Sep />
      <Field label="中心纬度（圆锥联动标准纬线）">
        <CenterLatSlider sliderClass="w-32" />
      </Field>
      <Sep />
      <Field label="重置">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" className="h-8" onClick={resetCenter}>
              <RotateCcw className="size-3.5" />
              重置经纬度
            </Button>
          </TooltipTrigger>
          <TooltipContent>恢复 中国居中（105°E）/ 赤道（0°）</TooltipContent>
        </Tooltip>
      </Field>
    </>
  );
}

function FillTab() {
  const [eraser, setEraser] = useAtom(eraserAtom);
  const undo = useSetAtom(undoAtom);
  const clearAll = useSetAtom(clearAllAtom);
  const canUndo = useAtomValue(historyAtom).length > 0;
  const fills = useAtomValue(fillsAtom);
  const hasFills = Object.keys(fills).length > 0;

  return (
    <>
      <Field label="颜色（末位可自定义，含透明度）">
        <ColorPalette />
      </Field>
      <Sep />
      <Field label="编辑">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={eraser ? "default" : "outline"} size="sm" onClick={() => setEraser(!eraser)}>
                <Eraser className="size-4" /> 橡皮擦
              </Button>
            </TooltipTrigger>
            <TooltipContent>点击已着色国家移除颜色</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={undo} disabled={!canUndo}>
                <Undo2 className="size-4" /> 撤销
              </Button>
            </TooltipTrigger>
            <TooltipContent>撤销上一步填色操作</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={clearAll} disabled={!hasFills}>
                <Trash2 className="size-4" /> 清空
              </Button>
            </TooltipTrigger>
            <TooltipContent>清除所有填色</TooltipContent>
          </Tooltip>
        </div>
      </Field>
    </>
  );
}

function StyleTab() {
  return (
    <>
      <Field label="陆地颜色"><LandField /></Field>
      <Sep />
      <Field label="海洋颜色"><SeaField /></Field>
      <Sep />
      <Field label="边界颜色"><BorderField /></Field>
      <Sep />
      <Field label="边界粗细"><StyleBorderField sliderClass="w-36" bare /></Field>
      <Sep />
      <Field label="重置">
        <div className="flex items-center h-8"><StyleResetButton /></div>
      </Field>
    </>
  );
}

/** 画布尺寸/间距输入：数字输入，夹取到 [min,max]，失焦/回车提交 */
function SizeInput({
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
      className="w-[4.6rem] h-8 text-right text-[13px] font-mono"
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

function DataTab() {
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
  const [showImport, setShowImport] = useAtom(showImportAtom);
  const [exportW, setExportW] = useAtom(exportWidthAtom);
  const [exportH, setExportH] = useAtom(exportHeightAtom);
  const [exportPad, setExportPad] = useAtom(exportPaddingAtom);

  const exportSvg = () => {
    const svg = buildSvgString({
      fills, projectionId, centerLon, centerLat,
      defaultColor: landColor, borderColor, borderWidth, seaColor,
      title: mapTitle.trim() || undefined,
      showLegend: withLegend,
      width: exportW, height: exportH, padding: exportPad,
    });
    downloadSvg(svg, `${mapTitle.trim() || "世界地图填色"}.svg`);
  };

  return (
    <>
      <Field label="导出设置">
        <div className="flex items-center gap-2">
          <Input
            className="h-8 w-36"
            placeholder="地图标题（可选）"
            value={mapTitle}
            onChange={(e) => setMapTitle(e.target.value)}
          />
          <div className="flex items-center gap-1.5">
            <Checkbox id="legend" checked={withLegend} onCheckedChange={(v) => setWithLegend(v === true)} />
            <Label htmlFor="legend" className="text-sm cursor-pointer font-normal whitespace-nowrap">含图例</Label>
          </div>
        </div>
      </Field>
      <Sep />
      <Field label={`画布尺寸（viewBox="0 0 ${exportW} ${exportH}"，屏幕所见即导出）`}>
        <div className="flex items-center gap-1.5 h-8">
          <SizeInput value={exportW} onChange={setExportW} label="宽" />
          <span className="text-muted-foreground text-sm">×</span>
          <SizeInput value={exportH} onChange={setExportH} label="高" />
        </div>
      </Field>
      <Sep />
      <Field label="上下间距（viewBox 单位）">
        <div className="flex items-center h-8">
          <SizeInput value={exportPad} onChange={setExportPad} label="间距" min={0} max={400} />
        </div>
      </Field>
      <Sep />
      <Field label="导出">
        <div className="flex items-center gap-1.5">
          <Button size="sm" onClick={exportSvg}>
            <FileDown className="size-4" /> SVG
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" disabled={!hasFills}
                onClick={() => downloadJson(fillsToJson(fills), "填色配置.json")}>
                <FileCode2 className="size-4" /> JSON
              </Button>
            </TooltipTrigger>
            <TooltipContent>以中文国家名为键导出</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" disabled={!hasFills}
                onClick={() => downloadJson(JSON.stringify(fillsToIsoObject(fills), null, 2), "填色配置-ISO.json")}>
                ISO
              </Button>
            </TooltipTrigger>
            <TooltipContent>以 ISO 3166-1 alpha-3 代码为键导出（无歧义）</TooltipContent>
          </Tooltip>
        </div>
      </Field>
      <Sep />
      <Field label="导入填色配置">
        <Button variant="outline" size="sm" onClick={() => setShowImport(!showImport)}>
          <Braces className="size-4" /> {showImport ? "收起导入面板" : "展开导入面板"}
        </Button>
      </Field>
      {showImport && (
        <div className="flex-1 min-w-[300px]">
          <ImportForm onDone={() => setShowImport(false)} />
        </div>
      )}
    </>
  );
}

export default function Ribbon() {
  const [tab, setTab] = useState<TabKey>("fill");
  const fills = useAtomValue(fillsAtom);
  const hasFills = Object.keys(fills).length > 0;

  return (
    <TooltipProvider delayDuration={300}>
      <header className="shrink-0 bg-background border-b shadow-sm">
        {/* 标题 + 选项卡（同一行） */}
        <div className="flex items-center gap-1 px-3 border-b">
          <h1 className="flex items-center gap-1.5 text-sm font-bold mr-3">
            <Globe2 className="size-4 text-primary" />
            世界地图填色
          </h1>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={cn(
                "px-3.5 py-2 text-sm border-b-2 -mb-px transition-colors",
                tab === t.key
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {t.key === "fill" && hasFills && (
                <span className="ml-1 text-xs text-muted-foreground">({Object.keys(fills).length})</span>
              )}
            </button>
          ))}
        </div>
        {/* 面板：控件 + 控件级小标签，分隔线分组 */}
        <div className="flex items-stretch gap-3 px-3 py-2 flex-wrap">
          {tab === "map" && <MapTab />}
          {tab === "fill" && <FillTab />}
          {tab === "style" && <StyleTab />}
          {tab === "data" && <DataTab />}
        </div>
      </header>
    </TooltipProvider>
  );
}
