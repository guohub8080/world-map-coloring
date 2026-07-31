import { useAtom } from "jotai";
import { currentColorAtom, eraserAtom } from "../atoms/mapAtoms";
import { cn } from "@/lib/utils";
import { ColorPicker } from "@/components/ui/color-picker";

export const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1",
  "#8b5cf6", "#d946ef", "#ec4899", "#f43f5e", "#a16207",
  "#78716c", "#64748b", "#1e293b",
];

export default function ColorPalette() {
  const [currentColor, setCurrentColor] = useAtom(currentColorAtom);
  const [eraser, setEraser] = useAtom(eraserAtom);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          className={cn(
            "w-6 h-6 rounded-full transition-transform hover:scale-110 ring-2 ring-offset-1",
            !eraser && currentColor === c ? "ring-gray-800 scale-110" : "ring-transparent shadow-sm border border-black/5"
          )}
          style={{ background: c }}
          onClick={() => {
            setCurrentColor(c);
            setEraser(false);
          }}
          title={c}
        />
      ))}
      <span
        className={cn(
          "inline-flex rounded-full ring-2 ring-offset-1 transition-transform hover:scale-110",
          !eraser && !PRESET_COLORS.includes(currentColor) ? "ring-gray-800 scale-110" : "ring-transparent shadow-sm"
        )}
        title="自定义颜色（支持透明度）"
      >
        <ColorPicker
          value={currentColor}
          onChange={(v) => {
            setCurrentColor(v);
            setEraser(false);
          }}
          className="w-6 h-6 rounded-full"
        />
      </span>
    </div>
  );
}
