// src/utils/storage.ts
import type { StreetEntry } from "./normalize";

const COOKIE_NAME = "haifa_streets_progress";
const STORAGE_KEY = "haifa_streets_game_v1";

interface SavedData {
  revealed: string[]; // canonical name_he array
  elapsedMs: number;
  savedAt: number;
}

/** Set a persistent cookie with 1 year expiration */
export function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure =
    typeof location !== "undefined" && location.protocol === "https:"
      ? "; Secure"
      : "";
  // SameSite=Lax for standard local & first-party usage
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

/** Read a cookie by name */
export function getCookie(name: string): string | null {
  const prefix = `${encodeURIComponent(name)}=`;
  const cookies = document.cookie.split(";");
  for (let c of cookies) {
    c = c.trim();
    if (c.startsWith(prefix)) {
      try {
        return decodeURIComponent(c.substring(prefix.length));
      } catch {
        return c.substring(prefix.length);
      }
    }
  }
  return null;
}

/** Delete a cookie */
export function deleteCookie(name: string) {
  const secure =
    typeof location !== "undefined" && location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax${secure}`;
}

/**
 * Encode an array of found indices into a compact Base64 bitmask
 * 1,115 streets = 140 bytes of raw data, ~188 chars in Base64!
 * Perfectly fits inside the 4KB browser cookie limit.
 */
function encodeBitset(foundIndices: number[], total: number): string {
  const byteCount = Math.ceil(total / 8);
  const bytes = new Uint8Array(byteCount);
  for (const idx of foundIndices) {
    if (idx >= 0 && idx < total) {
      const byteIdx = Math.floor(idx / 8);
      const bitIdx = idx % 8;
      bytes[byteIdx] |= 1 << bitIdx;
    }
  }
  // Convert binary to binary string for btoa
  let binStr = "";
  for (let i = 0; i < bytes.length; i++) {
    binStr += String.fromCharCode(bytes[i]);
  }
  return btoa(binStr);
}

/** Decode Base64 bitmask back to array of found indices */
function decodeBitset(base64: string, total: number): number[] {
  try {
    const binStr = atob(base64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    const indices: number[] = [];
    for (let i = 0; i < total; i++) {
      const byteIdx = Math.floor(i / 8);
      const bitIdx = i % 8;
      if (byteIdx < bytes.length && (bytes[byteIdx] & (1 << bitIdx)) !== 0) {
        indices.push(i);
      }
    }
    return indices;
  } catch {
    return [];
  }
}

/** Save game progress to both Cookie (compact bitmask) and localStorage (full JSON) */
export function saveProgress(
  revealed: Set<string>,
  elapsedMs: number,
  allStreets: StreetEntry[]
) {
  if (allStreets.length === 0) return;

  // 1. Map canonical name_he to indices
  const nameToIndex = new Map<string, number>();
  allStreets.forEach((s, idx) => nameToIndex.set(s.name_he, idx));

  const foundIndices: number[] = [];
  revealed.forEach((name) => {
    const idx = nameToIndex.get(name);
    if (idx !== undefined) foundIndices.push(idx);
  });

  // 2. Cookie format: "v1:<elapsedSeconds>:<base64Bitset>"
  // E.g. "v1:142:A+4G8..." ~ 200 bytes total!
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const bitset = encodeBitset(foundIndices, allStreets.length);
  const cookiePayload = `v1:${elapsedSec}:${bitset}`;
  setCookie(COOKIE_NAME, cookiePayload, 365);

  // 3. Backup to localStorage for redundancy
  try {
    const data: SavedData = {
      revealed: Array.from(revealed),
      elapsedMs,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage might be unavailable in some private windows
  }
}

/** Load game progress from Cookie or localStorage fallback */
export function loadProgress(allStreets: StreetEntry[]): {
  revealed: Set<string>;
  elapsedMs: number;
} | null {
  if (allStreets.length === 0) return null;

  // 1. Try Cookie first
  const cookieVal = getCookie(COOKIE_NAME);
  if (cookieVal && cookieVal.startsWith("v1:")) {
    const parts = cookieVal.split(":");
    if (parts.length === 3) {
      const elapsedSec = parseInt(parts[1], 10) || 0;
      const bitset = parts[2];
      const indices = decodeBitset(bitset, allStreets.length);

      const revealed = new Set<string>();
      for (const idx of indices) {
        if (allStreets[idx]) {
          revealed.add(allStreets[idx].name_he);
        }
      }

      return {
        revealed,
        elapsedMs: elapsedSec * 1000,
      };
    }
  }

  // 2. Fallback to localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as SavedData;
      if (Array.isArray(data.revealed)) {
        return {
          revealed: new Set(data.revealed),
          elapsedMs: data.elapsedMs || 0,
        };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/** Clear all saved progress from cookie and localStorage */
export function clearSavedProgress() {
  deleteCookie(COOKIE_NAME);
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
