"use client";
import { useEffect, useState } from "react";
import { Check, HardDriveDownload } from "lucide-react";
import { backupStatus } from "@/lib/store";
import { isCancel, shareBackup } from "@/lib/backup";
import { fmt } from "@/lib/money";
import { DAY } from "@/lib/time";
import { tw } from "@/lib/tw";

const DUE_AFTER = 3 * DAY;

/** Nags the owner when there are sales that exist only on this iPad, with a one-tap backup. */
export function BackupReminder({ className = "" }: { className?: string }) {
  const [due, setDue] = useState<{ days: number | null; bills: number } | null>(null);
  const [state, setState] = useState<"" | "busy" | "done" | string>("");

  useEffect(() => {
    backupStatus().then(({ lastBackupAt, unsavedBills }) => {
      const age = lastBackupAt === null ? Infinity : Date.now() - lastBackupAt;
      if (unsavedBills > 0 && age > DUE_AFTER) setDue({ days: lastBackupAt === null ? null : Math.floor(age / DAY), bills: unsavedBills });
    });
  }, []);

  async function backup() {
    setState("busy");
    try {
      await shareBackup();
      setState("done");
      setTimeout(() => setDue(null), 2500);
    } catch (e) {
      setState(isCancel(e) ? "" : (e as Error).message || "ສຳຮອງບໍ່ສຳເລັດ");
    }
  }

  if (!due) return null;
  return (
    <div className={tw("flex flex-wrap items-center gap-3 bg-marigold-faint px-5 py-3 text-ink ring-1 ring-marigold", className)} role="status">
      <HardDriveDownload className="size-6 shrink-0 text-marigold-deep" />
      <span className="min-w-0 flex-1">
        <b>{due.days === null ? "ຍັງບໍ່ເຄີຍສຳຮອງຂໍ້ມູນ" : `ບໍ່ໄດ້ສຳຮອງຂໍ້ມູນ ${fmt(due.days)} ມື້ແລ້ວ`}</b>
        <span className="block text-sm">
          ມີ <span className="num">{fmt(due.bills)}</span> ບິນທີ່ຢູ່ໃນ iPad ເຄື່ອງນີ້ເທົ່ານັ້ນ — ຖ້າເຄື່ອງເສຍ ຫຼື ຫາຍ ຂໍ້ມູນຈະຫາຍໝົດ.
        </span>
        {state && state !== "busy" && state !== "done" && <span className="block text-sm text-chili">{state}</span>}
      </span>
      {state === "done" ? (
        <span className="flex h-11 items-center gap-1 px-2 font-semibold text-leaf">
          <Check className="size-5" /> ສຳຮອງແລ້ວ
        </span>
      ) : (
        <button
          onClick={backup}
          disabled={state === "busy"}
          className="h-11 shrink-0 rounded-xl bg-ink px-5 font-semibold text-white active:bg-ink-soft disabled:opacity-40"
        >
          {state === "busy" ? "ກຳລັງສຳຮອງ…" : "ສຳຮອງດຽວນີ້"}
        </button>
      )}
    </div>
  );
}
