// src/components/InputBox.tsx
import { useState, useRef, useEffect } from "react";
import type { MatchResult } from "../hooks/useStreetMatcher";

interface Props {
  onSubmit: (input: string) => MatchResult;
  disabled: boolean;
  autoFocus?: boolean;
}

type Feedback = "matched" | "already" | "miss" | null;

export function InputBox({ onSubmit, disabled, autoFocus = true }: Props) {
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!disabled && autoFocus) {
      inputRef.current?.focus();
    }
  }, [disabled, autoFocus]);

  function clearFeedback() {
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    feedbackTimeout.current = setTimeout(() => setFeedback(null), 800);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setValue(v);

    // Live matching on every keystroke
    const result = onSubmit(v);
    if (result.status === "matched") {
      setValue("");
      setFeedback("matched");
      clearFeedback();
    } else if (result.status === "already") {
      setFeedback("already");
      clearFeedback();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      const result = onSubmit(value);
      if (result.status === "matched") {
        setValue("");
        setFeedback("matched");
      } else if (result.status === "already") {
        setFeedback("already");
      } else if (result.status === "miss") {
        setFeedback("miss");
      }
      clearFeedback();
    }
  }

  const borderColor =
    feedback === "matched"
      ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200"
      : feedback === "already"
        ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200"
        : feedback === "miss"
          ? "border-rose-400 bg-rose-50 ring-2 ring-rose-200"
          : "border-slate-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200";

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          dir="auto"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={disabled}
          placeholder="הקלד שם רחוב... / Type street"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={`w-full text-base sm:text-lg px-4 py-3 sm:py-3.5 pr-10 rounded-xl border-2 font-medium transition-all duration-150 outline-none shadow-xs ${borderColor}`}
          style={{
            fontFamily: "'Heebo', 'Arial', sans-serif",
            fontSize: "16px", // strictly 16px to prevent iOS Safari auto-zoom
          }}
        />

        {value && (
          <button
            type="button"
            onClick={() => setValue("")}
            className="absolute left-3 p-1 text-slate-400 hover:text-slate-600 rounded-full"
            aria-label="נקה"
          >
            ✕
          </button>
        )}
      </div>

      <div className="h-4 sm:h-5 text-xs sm:text-sm text-center font-medium">
        {feedback === "matched" && (
          <span className="text-emerald-600 font-bold animate-pulse">✓ נמצא ברחובות חיפה!</span>
        )}
        {feedback === "already" && (
          <span className="text-amber-600">כבר נמצא קודם</span>
        )}
        {feedback === "miss" && (
          <span className="text-rose-500">לא נמצא ברחובות חיפה</span>
        )}
      </div>
    </div>
  );
}
