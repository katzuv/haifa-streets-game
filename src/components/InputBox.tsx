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

  const valueRef = useRef(value);
  valueRef.current = value;

  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  useEffect(() => {
    if (!disabled && autoFocus) {
      inputRef.current?.focus();
    }
  }, [disabled, autoFocus]);

  // Global key capture: if user clicks on the map or anywhere else and starts typing,
  // refocus the input box and append the keystroke so nothing is lost.
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (disabledRef.current) return;
      const input = inputRef.current;
      if (!input) return;

      // Only handle if this input instance is visible in the viewport
      if (input.offsetWidth === 0 && input.offsetHeight === 0) return;

      // Ignore if user is already typing in an input or textarea
      const active = document.activeElement as HTMLElement | null;
      if (
        active === input ||
        active?.tagName === "INPUT" ||
        active?.tagName === "TEXTAREA" ||
        active?.isContentEditable
      ) {
        return;
      }

      // Ignore browser shortcuts / modifier keys
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "Backspace") {
        e.preventDefault();
        input.focus();
        const nextValue = valueRef.current.slice(0, -1);
        setValue(nextValue);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        input.focus();
        const result = onSubmitRef.current(valueRef.current);
        if (result.status === "matched") {
          setValue("");
          setFeedback("matched");
        } else if (result.status === "already") {
          setFeedback("already");
        } else if (result.status === "miss") {
          setFeedback("miss");
        }
        clearFeedback();
        return;
      }

      // Single printable character (Hebrew/English letter, number, space, etc.)
      if (e.key.length === 1) {
        e.preventDefault();
        input.focus();
        const nextValue = valueRef.current + e.key;
        setValue(nextValue);

        const result = onSubmitRef.current(nextValue);
        if (result.status === "matched") {
          setValue("");
          setFeedback("matched");
          clearFeedback();
        } else if (result.status === "already") {
          setFeedback("already");
          clearFeedback();
        }
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, []);

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
          placeholder="הקלד שם רחוב / Type street"
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
