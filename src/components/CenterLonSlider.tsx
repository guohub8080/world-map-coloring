import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import type { PrimitiveAtom } from "jotai";
import { centerLonAtom, centerLatAtom } from "../atoms/mapAtoms";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * 中心经纬度控件：shadcn Slider + 数字输入，双向绑定。
 * 拖动滑杆 → 输入框同步；输入数字 → 滑杆同步；超出范围自动夹取。
 */
function CenterSlider({
  atom, min, max, suffix, title, sliderClass = "w-36", className,
}: {
  atom: PrimitiveAtom<number>;
  min: number; max: number;
  suffix: string; title: string;
  sliderClass?: string; className?: string;
}) {
  const [value, setValue] = useAtom(atom);
  const [text, setText] = useState(String(value));

  // 外部变化（预设下拉等）→ 同步输入框
  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const v = Number(raw);
    if (raw.trim() === "" || isNaN(v)) {
      setText(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, Math.round(v)));
    setText(String(clamped));
    if (clamped !== value) setValue(clamped);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Slider
        className={sliderClass}
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={([v]) => setValue(v)}
        title={title}
      />
      <div className="relative shrink-0">
        <Input
          className="w-[4.2rem] h-8 pr-6 text-right text-[13px] font-mono"
          inputMode="numeric"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const v = Number(e.target.value);
            if (e.target.value.trim() !== "" && !isNaN(v) && v >= min && v <= max) {
              setValue(Math.round(v));
            }
          }}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commit((e.target as HTMLInputElement).value)}
          title={title}
        />
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none">{suffix}</span>
      </div>
    </div>
  );
}

export default function CenterLonSlider(props: { sliderClass?: string; className?: string }) {
  return (
    <CenterSlider
      atom={centerLonAtom}
      min={-180} max={180}
      suffix="°E"
      title="中心经度（-180 ~ 180）"
      {...props}
    />
  );
}

export function CenterLatSlider(props: { sliderClass?: string; className?: string }) {
  return (
    <CenterSlider
      atom={centerLatAtom}
      min={-80} max={80}
      suffix="°N"
      title="中心纬度（-80 ~ 80，圆锥投影联动标准纬线）"
      {...props}
    />
  );
}
