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
  await shareFile(new File([JSON.stringify(data)], name, { type: "application/json" }));
  await markBackedUp();
}

/** iPad share sheet (Files / LINE / Numbers / Excel); a plain download elsewhere. Start it from a tap. */
export async function shareFile(file: File) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return;
    } catch (e) {
      // Cancelled by the user: stop. Not allowed (tap expired): fall back to a download.
      if ((e as Error)?.name !== "NotAllowedError") throw e;
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

export const isCancel = (e: unknown) => /abort|cancel/i.test(`${(e as Error)?.name} ${(e as Error)?.message}`);
