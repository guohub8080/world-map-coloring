import { useEffect, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { filledEntriesAtom, isoJsonAtom, removeFillAtom, setFillsAtom } from "../atoms/mapAtoms";
import { parseFillsJson } from "../lib/fillIO";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Copy, Check, AlertCircle } from "lucide-react";

export function SidebarBody() {
  const entries = useAtomValue(filledEntriesAtom);
  const isoJson = useAtomValue(isoJsonAtom);
  const removeFill = useSetAtom(removeFillAtom);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(isoJson).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <>
      <div className="px-3 py-2.5 border-b text-sm font-semibold">
        已着色国家/地区（{entries.length}）
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {entries.length === 0 && (
            <p className="text-xs text-muted-foreground p-2 leading-relaxed">
              点击地图上的国家即可填色。滚轮缩放，拖拽平移。
            </p>
          )}
          {entries.map(([name, color]) => (
            <div key={name} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent group">
              <span className="w-4 h-4 rounded border shrink-0" style={{ background: color }} />
              <span className="text-sm truncate flex-1">{name}</span>
              <button
                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFill(name)}
                title="移除"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>

      <JsonEditor onCopy={copy} copied={copied} canCopy={entries.length > 0} />
    </>
  );
}

/**
 * ISO-3 JSON 编辑器：与填色数据双向绑定。
 * - 填色 / 撤销 / 清空 → 文本实时同步；
 * - 手动编辑 → 每次输入即时解析并回写 fills（合法时），地图、列表同步更新；
 * - 非法 JSON / 未识别的国家代码 / 非法颜色值 → 红框 + 错误提示，
 *   且不破坏当前已着色数据。
 */
function JsonEditor({ onCopy, copied, canCopy }: { onCopy: () => void; copied: boolean; canCopy: boolean }) {
  const isoJson = useAtomValue(isoJsonAtom);
  const setFills = useSetAtom(setFillsAtom);
  const [text, setText] = useState(isoJson);
  const [errors, setErrors] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);

  // 外部 fills 变化（点击填色 / 撤销 / 清空）→ 非编辑状态下同步文本
  useEffect(() => {
    if (!editing) {
      setText(isoJson);
      setErrors([]);
    }
  }, [isoJson, editing]);

  const handleChange = (value: string) => {
    setText(value);
    if (value.trim() === "") {
      setErrors([]);
      setFills({});
      return;
    }
    const { fills, errors: errs } = parseFillsJson(value);
    setErrors(errs);
    // 只有整体可解析时才回写，保留当前地图上的颜色不被中间态破坏
    if (!errs.includes("JSON 解析失败，请检查格式")) {
      setFills(fills);
    }
  };

  return (
    <div className="border-t flex flex-col max-h-64">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm font-semibold">ISO-3 JSON（可编辑）</span>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={!canCopy} onClick={onCopy}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "已复制" : "复制"}
        </Button>
      </div>
      <textarea
        className={`flex-1 min-h-24 mx-2 px-2 py-1.5 text-[11px] leading-relaxed font-mono bg-muted/50 border rounded-md whitespace-pre resize-none outline-none focus-visible:ring-2 ${
          errors.length > 0
            ? "border-destructive text-destructive focus-visible:ring-destructive/40"
            : "text-muted-foreground focus-visible:ring-ring/50"
        }`}
        value={text}
        spellCheck={false}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setEditing(true)}
        onBlur={() => setEditing(false)}
      />
      <div className="mx-2 mt-1 mb-2 min-h-4">
        {errors.length > 0 ? (
          <div className="flex items-start gap-1 text-[11px] leading-snug text-destructive">
            <AlertCircle className="size-3 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{errors[0]}{errors.length > 1 ? `（共 ${errors.length} 处）` : ""}</span>
          </div>
        ) : (
          <p className="text-[11px] leading-snug text-muted-foreground/70">
            键支持 ISO-3 / ISO-2 / 中文名，编辑后实时同步到地图
          </p>
        )}
      </div>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-60 bg-background border-l flex flex-col min-h-0">
      <SidebarBody />
    </aside>
  );
}
