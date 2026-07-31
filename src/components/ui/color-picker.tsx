import { useEffect, useState } from "react";
import { HexColorPicker, HexAlphaColorPicker, HexColorInput } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** 把任意可解析的 CSS 颜色转成 { hex6, alpha }（alpha 0-100） */
export function parseCssColor(input: string): { hex6: string; alpha: number } {
  const fallback = { hex6: "#3b82f6", alpha: 100 };
  const el = document.createElement("div");
  el.style.color = "";
  el.style.color = input;
  if (!el.style.color) return fallback;
  document.body.appendChild(el);
  const computed = getComputedStyle(el).color;
  document.body.removeChild(el);
  const m = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return fallback;
  const toHex = (n: string) => Number(n).toString(16).padStart(2, "0");
  const hex6 = `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
  const alpha = m[4] !== undefined ? Math.round(Number(m[4]) * 100) : 100;
  return { hex6, alpha };
}

/** 组合 hex6 + alpha 为最终颜色字符串（alpha<100 输出 #RRGGBBAA） */
export function composeColor(hex6: string, alpha: number): string {
  if (alpha >= 100) return hex6;
  return hex6 + Math.round((alpha / 100) * 255).toString(16).padStart(2, "0");
}

/** 棋盘格背景（用于预览透明色） */
const CHECKER =
  "repeating-conic-gradient(#d4d4d4 0% 25%, #ffffff 0% 50%) 0 0 / 12px 12px";

interface ColorPickerProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  /** 是否提供透明度控制（默认 true） */
  withAlpha?: boolean;
  /** 弹层对齐方向 */
  align?: "start" | "center" | "end";
}

/** shadcn 风格取色器：色板触发器 + Popover（色轮 / hex 输入 / 透明度） */
export function ColorPicker({ value, onChange, className, withAlpha = true, align = "start" }: ColorPickerProps) {
  const parsed = parseCssColor(value);
  const [hex6, setHex6] = useState(parsed.hex6);
  const [alpha, setAlpha] = useState(parsed.alpha);
  const [alphaText, setAlphaText] = useState(String(parsed.alpha));

  // 外部值变化时同步内部状态
  useEffect(() => {
    const p = parseCssColor(value);
    setHex6(p.hex6);
    setAlpha(p.alpha);
    setAlphaText(String(p.alpha));
  }, [value]);

  const update = (h: string, a: number) => {
    setHex6(h);
    setAlpha(a);
    setAlphaText(String(a));
    onChange(composeColor(h, a));
  };

  // 带 alpha 的 pickers 直接读写 #RRGGBBAA，纯色 picker 只读写 #RRGGBB
  const pickerColor = withAlpha ? composeColor(hex6, alpha) : hex6;
  const onPickerChange = (c: string) => {
    const h = c.slice(0, 7).toLowerCase();
    const a = c.length === 9 ? Math.round((parseInt(c.slice(7), 16) / 255) * 100) : 100;
    update(h, a);
  };

  const commitAlphaText = () => {
    const n = Math.round(Number(alphaText));
    if (alphaText.trim() === "" || isNaN(n)) {
      setAlphaText(String(alpha));
      return;
    }
    update(hex6, Math.min(100, Math.max(0, n)));
  };

  const preview = composeColor(hex6, alpha);
  const Picker = withAlpha ? HexAlphaColorPicker : HexColorPicker;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn("rounded-md border shadow-sm cursor-pointer transition-transform hover:scale-105 overflow-hidden", className)}
          style={{ background: CHECKER }}
          title={value}
        >
          <span className="block w-full h-full" style={{ background: preview }} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] space-y-3" align={align} sideOffset={8}>
        <Picker color={pickerColor} onChange={onPickerChange} style={{ width: "100%", height: 168 }} />

        <div className="flex items-center gap-1.5 wmf-picker-row">
          {/* 预览色板（棋盘格底） */}
          <div className="w-9 h-9 rounded-md border overflow-hidden shrink-0" style={{ background: CHECKER }}>
            <div className="w-full h-full" style={{ background: preview }} />
          </div>
          {/* hex 输入 */}
          <div className="flex-1 min-w-0 relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">#</span>
            <HexColorInput
              color={pickerColor}
              onChange={onPickerChange}
              alpha={withAlpha}
              prefixed={false}
              className="wmf-hex-input h-9 min-w-0 rounded-md border border-input bg-transparent pl-5 pr-1 text-[13px] font-mono uppercase shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            />
          </div>
          {withAlpha && (
            <>
              <Label className="text-xs text-muted-foreground whitespace-nowrap shrink-0">不透明</Label>
              <div className="relative w-[3.8rem] shrink-0">
                <Input
                  className="h-9 pl-1.5 pr-5 text-[13px] font-mono text-right"
                  inputMode="numeric"
                  value={alphaText}
                  onChange={(e) => setAlphaText(e.target.value)}
                  onBlur={commitAlphaText}
                  onKeyDown={(e) => e.key === "Enter" && commitAlphaText()}
                />
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none">%</span>
              </div>
            </>
          )}
        </div>

        {withAlpha && (
          <input
            type="range"
            min={0}
            max={100}
            value={alpha}
            onChange={(e) => update(hex6, Number(e.target.value))}
            className="w-full h-3 appearance-none rounded-full border cursor-pointer"
            style={{
              background: `linear-gradient(to right, transparent, ${hex6}), ${CHECKER}`,
            }}
          />
        )}
        <style>{`
          .wmf-picker-row .react-colorful__pointer { box-sizing: border-box; }
          .wmf-hex-input { width: 100% !important; }
        `}</style>
      </PopoverContent>
    </Popover>
  );
}
