// src/components/FinishedModal.tsx

interface Props {
  revealed: number;
  total: number;
  elapsedMs: number;
  onRestart: () => void;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function FinishedModal({ revealed, total, elapsedMs, onRestart }: Props) {
  const shareText = `מצאתי ${revealed}/${total} רחובות בחיפה תוך ${formatTime(elapsedMs)}! 🗺️`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-4">
        <div className="text-5xl">🎉</div>
        <h2
          className="text-2xl font-bold text-gray-900"
          style={{ fontFamily: "'Heebo', 'Arial', sans-serif" }}
          dir="rtl"
        >
          {revealed === total ? "כל הכבוד! סיימת!" : "המשחק הסתיים"}
        </h2>
        <p className="text-gray-600" dir="rtl">
          מצאת{" "}
          <span className="font-bold text-blue-600">
            {revealed} מתוך {total}
          </span>{" "}
          רחובות בחיפה
        </p>
        <p className="text-gray-500 font-mono text-lg">{formatTime(elapsedMs)}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(shareText);
            }}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 transition"
          >
            📋 העתק תוצאה
          </button>
          <button
            onClick={onRestart}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition"
          >
            🔄 שחק שוב
          </button>
        </div>
      </div>
    </div>
  );
}
