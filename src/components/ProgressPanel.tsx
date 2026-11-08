// src/components/ProgressPanel.tsx
import { useMemo } from "react";

interface Props {
  revealed: number;
  total: number;
  elapsedMs: number;
  compact?: boolean;
}

export function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ProgressPanel({ revealed, total, elapsedMs, compact = false }: Props) {
  const pct = total > 0 ? Math.round((revealed / total) * 100) : 0;

  const barColor = useMemo(() => {
    if (pct >= 80) return "bg-emerald-500";
    if (pct >= 50) return "bg-blue-600";
    if (pct >= 20) return "bg-amber-400";
    return "bg-slate-400";
  }, [pct]);

  if (compact) {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-slate-900">{revealed}</span>
            <span className="text-slate-400">/ {total}</span>
            <span className="text-slate-400 font-normal">({pct}%)</span>
          </div>
          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">
            {formatTime(elapsedMs)}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm font-medium text-slate-600">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-slate-900">{revealed}</span>
          <span className="text-slate-400">/ {total} רחובות</span>
        </div>
        <span className="font-mono text-base font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
          {formatTime(elapsedMs)}
        </span>
      </div>

      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-xs text-slate-400">
        <span>{pct}% מהעיר נמצאו</span>
        <span className="text-emerald-600 font-medium">💾 נשמר לעוגייה</span>
      </div>
    </div>
  );
}
