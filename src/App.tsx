// src/App.tsx
import { useEffect, useRef, useCallback, useState } from "react";
import { GameMap } from "./components/GameMap";
import { InputBox } from "./components/InputBox";
import { ProgressPanel } from "./components/ProgressPanel";
import { FoundList } from "./components/FoundList";
import { FinishedModal } from "./components/FinishedModal";
import { useGameState } from "./hooks/useGameState";
import { useStreetMatcher } from "./hooks/useStreetMatcher";
import type { MatchResult } from "./hooks/useStreetMatcher";
import { saveProgress, loadProgress, clearSavedProgress } from "./utils/storage";

export default function App() {
  const { state, start, restore, reveal, tick, reset, finish } = useGameState();
  const { streets, loading, error, tryMatch } = useStreetMatcher(state.revealed);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const initializedFromStorage = useRef(false);

  // 1. Restore from cookie / localStorage once streets list is loaded
  useEffect(() => {
    if (!loading && streets.length > 0 && !initializedFromStorage.current) {
      initializedFromStorage.current = true;
      const saved = loadProgress(streets);
      if (saved && saved.revealed.size > 0) {
        restore(streets.length, saved.revealed, saved.elapsedMs);
      } else {
        start(streets.length);
      }
    }
  }, [loading, streets, restore, start]);

  // 2. Save progress to cookie whenever revealed list changes
  useEffect(() => {
    if (streets.length > 0 && state.revealed.size > 0) {
      saveProgress(state.revealed, state.elapsedMs, streets);
    }
  }, [state.revealed, state.elapsedMs, streets]);

  // 3. Tick timer every second while playing
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (state.phase === "playing") {
      tickRef.current = setInterval(() => tick(Date.now()), 1000);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [state.phase, tick]);

  const handleSubmit = useCallback(
    (input: string): MatchResult => {
      const result = tryMatch(input);
      if (result.status === "matched") {
        reveal(result.name_he);
      }
      return result;
    },
    [tryMatch, reveal]
  );

  const handleRestart = useCallback(() => {
    if (
      state.revealed.size > 0 &&
      !window.confirm("האם אתה בטוח שברצונך לאפס את כל ההתקדמות ולהתחיל מחדש?")
    ) {
      return;
    }
    clearSavedProgress();
    reset(streets.length);
  }, [state.revealed.size, reset, streets.length]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-red-600 p-4">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-red-100 max-w-md">
          <p className="font-bold text-lg mb-2">שגיאה בטעינת נתוני הרחובות</p>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          <code className="text-xs bg-slate-100 px-3 py-1.5 rounded block text-slate-800">
            uv run scripts/fetch_haifa_streets.py
          </code>
        </div>
      </div>
    );
  }

  return (
    <div dir="ltr" className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-slate-100 select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-3 sm:px-6 py-2.5 bg-white border-b border-slate-200 z-20 shadow-xs flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl">🏙️</span>
          <div>
            <h1 className="text-sm sm:text-lg font-black text-slate-900 leading-tight">
              משחק רחובות חיפה
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium hidden sm:block">
              Haifa Streets Game • מצא את כל רחובות העיר
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile "Found List" drawer button */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-full text-xs font-bold transition-colors"
          >
            <span>רשימה</span>
            <span className="bg-blue-600 text-white px-1.5 py-0.2 rounded-full text-[10px]">
              {state.revealed.size}
            </span>
          </button>

          {/* Reset button */}
          {state.revealed.size > 0 && (
            <button
              type="button"
              onClick={handleRestart}
              className="text-xs text-slate-500 hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              title="איפוס והתחלה מחדש"
            >
              איפוס
            </button>
          )}

          {/* Total Streets Pill */}
          <span className="text-[11px] sm:text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full whitespace-nowrap">
            {state.revealed.size} / {state.totalStreets}
          </span>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Map Area */}
        <main className="flex-1 h-full relative overflow-hidden bg-white">
          <GameMap revealed={state.revealed} lastFound={state.lastFound} />

          {/* Mobile Floating Input Dock (visible only on small screens) */}
          <div className="md:hidden absolute bottom-3 inset-x-3 z-30 flex flex-col gap-2">
            <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200/80 flex flex-col gap-2">
              <ProgressPanel
                revealed={state.revealed.size}
                total={state.totalStreets}
                elapsedMs={state.elapsedMs}
                compact
              />
              <InputBox
                onSubmit={handleSubmit}
                disabled={state.phase !== "playing"}
                autoFocus={false}
              />
            </div>
          </div>
        </main>

        {/* Desktop Sidebar (hidden on mobile, visible md+) */}
        <aside
          dir="rtl"
          className="hidden md:flex w-84 xl:w-96 flex-shrink-0 bg-white border-l border-slate-200 flex-col p-4 gap-4 overflow-hidden shadow-lg z-10"
        >
          {/* Progress Tracker */}
          <section className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
            <ProgressPanel
              revealed={state.revealed.size}
              total={state.totalStreets}
              elapsedMs={state.elapsedMs}
            />
          </section>

          {/* Guess Input */}
          <section>
            <InputBox
              onSubmit={handleSubmit}
              disabled={state.phase !== "playing"}
              autoFocus
            />
          </section>

          {/* Give up button */}
          {state.phase === "playing" && (
            <button
              onClick={finish}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors self-center underline cursor-pointer"
            >
              ויתרתי / סיים משחק
            </button>
          )}

          {/* Scrollable list of found streets */}
          <section className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                רחובות שנמצאו
              </h2>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {state.revealed.size}
              </span>
            </div>
            <FoundList
              revealed={state.revealed}
              streets={streets}
              lastFound={state.lastFound}
            />
          </section>
        </aside>
      </div>

      {/* Mobile Drawer for Found Streets List */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs flex flex-col justify-end">
          <div
            dir="rtl"
            className="bg-white rounded-t-3xl max-h-[80dvh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">רחובות שנמצאו</span>
                <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                  {state.revealed.size}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1"
              >
                סגור ✕
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-4 flex-1 overflow-hidden flex flex-col min-h-60">
              <FoundList
                revealed={state.revealed}
                streets={streets}
                lastFound={state.lastFound}
              />
            </div>
          </div>
        </div>
      )}

      {/* Finished Modal */}
      {state.phase === "finished" && (
        <FinishedModal
          revealed={state.revealed.size}
          total={state.totalStreets}
          elapsedMs={state.elapsedMs}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
