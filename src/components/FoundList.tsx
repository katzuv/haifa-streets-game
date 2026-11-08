// src/components/FoundList.tsx
import { useEffect, useRef, useState } from "react";

interface Props {
  revealed: Set<string>;
  streets: { name_he: string; name_en?: string }[];
  lastFound: string | null;
}

export function FoundList({ revealed, streets, lastFound }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const lastFoundRef = useRef<HTMLDivElement>(null);
  const [filterText, setFilterText] = useState("");

  // Scroll to last found item
  useEffect(() => {
    if (lastFoundRef.current) {
      lastFoundRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [lastFound]);

  const foundStreets = streets.filter((s) => revealed.has(s.name_he));
  const filtered = filterText.trim()
    ? foundStreets.filter(
        (s) =>
          s.name_he.includes(filterText.trim()) ||
          (s.name_en && s.name_en.toLowerCase().includes(filterText.trim().toLowerCase()))
      )
    : foundStreets;

  if (foundStreets.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm italic p-6 text-center">
        <span className="text-3xl mb-2 opacity-50">🧭</span>
        <span>עוד לא נמצאו רחובות</span>
        <span className="text-xs text-slate-400 mt-1">הקלד שם רחוב כדי לחשוף אותו במפה</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {foundStreets.length > 8 && (
        <div className="mb-2">
          <input
            type="text"
            dir="auto"
            placeholder="סנן רחובות שנמצאו"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-400 outline-none"
          />
        </div>
      )}

      <div ref={listRef} className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
        {filtered.map((s) => {
          const isLast = s.name_he === lastFound;
          return (
            <div
              key={s.name_he}
              ref={isLast ? lastFoundRef : null}
              dir="rtl"
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
                isLast
                  ? "bg-amber-100/80 border border-amber-300 text-amber-950 font-bold shadow-xs scale-[1.01]"
                  : "bg-emerald-50/70 hover:bg-emerald-100/50 border border-emerald-100/70 text-slate-800"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-xs flex-shrink-0 ${isLast ? "text-amber-600" : "text-emerald-500"}`}>
                  ✓
                </span>
                <span
                  className="font-medium truncate"
                  style={{ fontFamily: "'Heebo', 'Arial', sans-serif" }}
                >
                  {s.name_he}
                </span>
              </div>
              {s.name_en && (
                <span className="text-slate-400 text-xs font-normal truncate max-w-[40%] text-left" dir="ltr">
                  {s.name_en}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
