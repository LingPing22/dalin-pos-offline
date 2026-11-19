"use client";
import { useEffect, useState } from "react";
import type { Role } from "./types";

export type Session = { uid: number; name: string; role: Role };

const KEY = "dalin.session.v1";
const HOURS = 14;
const ACTIVE_KEY = "dalin.active.v1";
const LOCK_KEY = "dalin.locked.v1";
export const LOCK_EVENT = "dalin:lock";

export function readSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!s || typeof s.uid !== "number" || s.exp < Date.now()) return null;
    return { uid: s.uid, name: s.name, role: s.role };
  } catch {
    return null;
  }
}

export function writeSession(s: Session) {
  localStorage.setItem(KEY, JSON.stringify({ ...s, exp: Date.now() + HOURS * 3600_000 }));
  setLocked(false);
}

export function clearSession() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(LOCK_KEY);
}

// ---------------------------------------------------------------- screen lock
// Kept in localStorage so reloading the page does not get past the lock screen.

export function touchActivity() {
  localStorage.setItem(ACTIVE_KEY, String(Date.now()));
}

/** ms since someone last touched the screen */
export function idleMs(): number {
  const t = Number(localStorage.getItem(ACTIVE_KEY));
  if (!t) {
    touchActivity();
    return 0;
  }
  return Date.now() - t;
}

export function isLocked(): boolean {
  return localStorage.getItem(LOCK_KEY) === "1";
}

export function setLocked(locked: boolean) {
  if (locked) {
    localStorage.setItem(LOCK_KEY, "1");
    window.dispatchEvent(new Event(LOCK_EVENT));
  } else {
    localStorage.removeItem(LOCK_KEY);
    touchActivity();
  }
}

/** undefined = still checking, null = logged out */
export function useSession(): Session | null | undefined {
  const [s, setS] = useState<Session | null | undefined>(undefined);
  useEffect(() => setS(readSession()), []);
  return s;
}
