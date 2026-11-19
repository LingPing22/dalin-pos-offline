"use client";
import { exportBackup, markBackedUp } from "./store";
import { toDateKey } from "./time";

/**
 * Builds the backup file and opens the iPad share sheet (Files / iCloud Drive / LINE).
 * Must be started from a tap. A cancelled share sheet throws AbortError and is NOT
 * counted as a backup.
 */
export async function shareBackup() {
  const data = await exportBackup();
  const name = `dalin-backup-${toDateKey(Date.now())}.json`;
  const file = new File([JSON.stringify(data)], name, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: name });
  } else {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = name;
    a.click();
  }
  await markBackedUp();
}

export const isCancel = (e: unknown) => /abort|cancel/i.test(`${(e as Error)?.name} ${(e as Error)?.message}`);
