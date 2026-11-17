"use client";
import { useEffect, useState } from "react";
import type { Role } from "./types";

export type Session = { uid: number; name: string; role: Role };

const KEY = "dalin.session.v1";
const HOURS = 14;

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
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

/** undefined = still checking, null = logged out */
export function useSession(): Session | null | undefined {
  const [s, setS] = useState<Session | null | undefined>(undefined);
  useEffect(() => setS(readSession()), []);
  return s;
}
