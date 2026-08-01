import { useAtom, useSetAtom } from "jotai";
import {
  landColorAtom, seaColorAtom, borderColorAtom, borderWidthAtom,
  dashColorAtom, dashWidthAtom, resetStyleAtom,
} from "../atoms/mapAtoms";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { RotateCcw } from "lucide-react";

function ColorField({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2.5">
      <Label className="text-sm text-muted-foreground whitespace-nowrap">{label}</Label>
      <ColorPicker value={value} onChange={onChange} className="w-9 h-9" />
      <span className="text-xs text-muted-foreground font-mono uppercase">{value}</span>
    </div>
  );
}

/** 颜色项 */
export function StyleColorFields() {
  const [land, setLand] = useAtom(landColorAtom);
  const [sea, setSea] = useAtom(seaColorAtom);
  const [border, setBorder] = useAtom(borderColorAtom);
  const [dash, setDash] = useAtom(dashColorAtom);
  return (
    <>
      <ColorField label="陆地颜色" value={land} onChange={setLand} />
      <ColorField label="海洋颜色" value={sea} onChange={setSea} />
      <ColorField label="边界颜色" value={border} onChange={setBorder} />
      <ColorField label="十段线颜色" value={dash} onChange={setDash} />
    </>
  );
}

/** 单项（不带文字标签，供 Ribbon Field 小标题配合使用） */
function BareColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2.5 h-8">
      <ColorPicker value={value} onChange={onChange} className="w-8 h-8" />
      <span className="text-xs text-muted-foreground font-mono uppercase">{value}</span>
    </div>
  );
}
export function LandField() {
  const [land, setLand] = useAtom(landColorAtom);
  return <BareColorField value={land} onChange={setLand} />;
}
export function SeaField() {
  const [sea, setSea] = useAtom(seaColorAtom);
  return <BareColorField value={sea} onChange={setSea} />;
}
export function BorderField() {
  const [border, setBorder] = useAtom(borderColorAtom);
  return <BareColorField value={border} onChange={setBorder} />;
}
export function DashColorField() {
  const [dash, setDash] = useAtom(dashColorAtom);
  return <BareColorField value={dash} onChange={setDash} />;
}

/** 边界粗细 */
export function StyleBorderField({ sliderClass = "w-32", bare = false }: { sliderClass?: string; bare?: boolean }) {
  const [borderW, setBorderW] = useAtom(borderWidthAtom);
  return (
    <div className={`flex items-center gap-2.5 ${bare ? "h-8" : ""}`}>
      {!bare && <Label className="text-sm text-muted-foreground whitespace-nowrap">边界粗细</Label>}
      <Slider
        className={sliderClass}
        min={0} max={2} step={0.1}
        value={[borderW]}
        onValueChange={([v]) => setBorderW(v)}
      />
      <span className="text-xs text-muted-foreground font-mono w-8">{borderW.toFixed(1)}</span>
    </div>
  );
}

/** 南海十段线粗细 */
export function StyleDashField({ sliderClass = "w-32", bare = false }: { sliderClass?: string; bare?: boolean }) {
  const [dashW, setDashW] = useAtom(dashWidthAtom);
  return (
    <div className={`flex items-center gap-2.5 ${bare ? "h-8" : ""}`}>
      {!bare && <Label className="text-sm text-muted-foreground whitespace-nowrap">十段线粗细</Label>}
      <Slider
        className={sliderClass}
        min={0} max={10} step={0.1}
        value={[dashW]}
        onValueChange={([v]) => setDashW(v)}
      />
      <span className="text-xs text-muted-foreground font-mono w-8">{dashW.toFixed(1)}</span>
    </div>
  );
}

/** 恢复默认按钮 */
export function StyleResetButton({ full = false }: { full?: boolean }) {
  const resetStyle = useSetAtom(resetStyleAtom);
  return (
    <Button variant="outline" size="sm" onClick={resetStyle} className={full ? "w-full" : ""}>
      <RotateCcw className="size-3.5" />
      恢复默认
    </Button>
  );
}

/** 所有样式项：横向由竖分隔线分组（Ribbon），纵向由水平分隔线分组（移动端） */
export function StyleFields({ sliderClass = "w-32", stack = false }: { sliderClass?: string; stack?: boolean }) {
  if (stack) {
    return (
      <div className="flex flex-col divide-y divide-border [&>*]:py-4 [&>*:first-child]:pt-1 [&>*:last-child]:pb-0">
        <ColorFieldStacked />
      </div>
    );
  }
  return (
    <>
      <StyleColorFields />
      <StyleBorderField sliderClass={sliderClass} />
      <StyleDashField sliderClass={sliderClass} />
      <StyleResetButton />
    </>
  );
}

/** 移动端竖排：每项一行，行间用水平分隔线 */
function ColorFieldStacked() {
  const [land, setLand] = useAtom(landColorAtom);
  const [sea, setSea] = useAtom(seaColorAtom);
  const [border, setBorder] = useAtom(borderColorAtom);
  const [dash, setDash] = useAtom(dashColorAtom);
  return (
    <>
      <ColorField label="陆地颜色" value={land} onChange={setLand} />
      <ColorField label="海洋颜色" value={sea} onChange={setSea} />
      <ColorField label="边界颜色" value={border} onChange={setBorder} />
      <ColorField label="十段线颜色" value={dash} onChange={setDash} />
      <StyleBorderField sliderClass="flex-1" />
      <StyleDashField sliderClass="flex-1" />
      <div><StyleResetButton full /></div>
    </>
  );
}

export default function StylePanel() {
  return (
    <div className="bg-background border-b px-4 py-3 flex items-center gap-x-8 gap-y-3 flex-wrap shadow-sm">
      <StyleFields />
    </div>
  );
}
