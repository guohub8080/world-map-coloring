import { useRef, useState } from "react";
import { useSetAtom } from "jotai";
import { importFillsAtom } from "../atoms/mapAtoms";
import { parseFillsJson } from "../lib/fillIO";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";

export function ImportForm({ onDone }: { onDone: () => void }) {
  const importFills = useSetAtom(importFillsAtom);
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const apply = (mode: "merge" | "replace") => {
    const { fills, errors } = parseFillsJson(text);
    setErrors(errors);
    if (Object.keys(fills).length === 0 && errors.length > 0) return;
    importFills({ fills, mode });
    if (errors.length === 0) {
      setText("");
      onDone();
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        className="h-32 font-mono text-sm"
        placeholder={'{\n  "CHN": "#ef4444",\n  "USA": "rgba(59, 130, 246, 0.5)",\n  "JP": "#f59e0b80",\n  "印度": "hsl(280, 70%, 50%)"\n}'}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {errors.length > 0 && (
        <div className="text-xs text-red-600 bg-red-50 rounded-md px-3 py-2 space-y-0.5">
          {errors.map((e, i) => <div key={i}>⚠ {e}</div>)}
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={() => apply("merge")}>合并导入</Button>
        <Button size="sm" variant="outline" onClick={() => apply("replace")}>替换全部</Button>
        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="size-3.5" />
          选择 JSON 文件…
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            file.text().then(setText);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
