// src/hooks/useStreetMatcher.ts
import { useState, useRef } from "react";
import {
  buildIndex,
  matchInput,
  type StreetEntry,
} from "../utils/normalize";
import { HAIFA_STREETS_INDEX } from "../data/haifaData";

export type MatchResult =
  | { status: "matched"; name_he: string }
  | { status: "already" }
  | { status: "miss" }
  | { status: "empty" };

export function useStreetMatcher(revealed: Set<string>) {
  const [streets] = useState<StreetEntry[]>(HAIFA_STREETS_INDEX);
  const loading = false;
  const error = null;
  const indexRef = useRef<Map<string, string>>(buildIndex(HAIFA_STREETS_INDEX));

  function tryMatch(input: string): MatchResult {
    if (!input.trim()) return { status: "empty" };
    const matched = matchInput(input, indexRef.current);
    if (!matched) return { status: "miss" };
    if (revealed.has(matched)) return { status: "already" };
    return { status: "matched", name_he: matched };
  }

  return { streets, loading, error, tryMatch };
}
