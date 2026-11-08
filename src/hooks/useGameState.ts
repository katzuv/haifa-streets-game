// src/hooks/useGameState.ts
import { useReducer, useCallback } from "react";

export interface GameState {
  phase: "idle" | "playing" | "finished";
  revealed: Set<string>; // set of name_he strings
  totalStreets: number;
  startTime: number | null;
  elapsedMs: number;
  lastFound: string | null; // for flash animation
}

type Action =
  | { type: "START"; total: number }
  | { type: "RESTORE"; total: number; revealed: Set<string>; elapsedMs: number }
  | { type: "REVEAL"; name_he: string }
  | { type: "TICK"; now: number }
  | { type: "RESET"; total: number }
  | { type: "FINISH" };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "START":
      return {
        phase: "playing",
        revealed: new Set(),
        totalStreets: action.total,
        startTime: Date.now(),
        elapsedMs: 0,
        lastFound: null,
      };

    case "RESTORE": {
      const isFinished = action.revealed.size >= action.total && action.total > 0;
      return {
        phase: isFinished ? "finished" : "playing",
        revealed: action.revealed,
        totalStreets: action.total,
        startTime: Date.now() - action.elapsedMs,
        elapsedMs: action.elapsedMs,
        lastFound: null,
      };
    }

    case "REVEAL": {
      if (state.revealed.has(action.name_he)) return state; // already found
      const next = new Set(state.revealed);
      next.add(action.name_he);
      const finished = next.size >= state.totalStreets && state.totalStreets > 0;
      return {
        ...state,
        revealed: next,
        lastFound: action.name_he,
        phase: finished ? "finished" : "playing",
      };
    }

    case "TICK":
      return {
        ...state,
        elapsedMs: state.startTime ? action.now - state.startTime : state.elapsedMs,
      };

    case "RESET":
      return {
        phase: "playing",
        revealed: new Set(),
        totalStreets: action.total,
        startTime: Date.now(),
        elapsedMs: 0,
        lastFound: null,
      };

    case "FINISH":
      return { ...state, phase: "finished" };

    default:
      return state;
  }
}

const INITIAL: GameState = {
  phase: "idle",
  revealed: new Set(),
  totalStreets: 0,
  startTime: null,
  elapsedMs: 0,
  lastFound: null,
};

export function useGameState() {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  const start = useCallback(
    (total: number) => dispatch({ type: "START", total }),
    []
  );

  const restore = useCallback(
    (total: number, revealed: Set<string>, elapsedMs: number) =>
      dispatch({ type: "RESTORE", total, revealed, elapsedMs }),
    []
  );

  const reveal = useCallback(
    (name_he: string) => dispatch({ type: "REVEAL", name_he }),
    []
  );

  const tick = useCallback(
    (now: number) => dispatch({ type: "TICK", now }),
    []
  );

  const reset = useCallback(
    (total: number) => dispatch({ type: "RESET", total }),
    []
  );

  const finish = useCallback(() => dispatch({ type: "FINISH" }), []);

  return { state, start, restore, reveal, tick, reset, finish };
}
