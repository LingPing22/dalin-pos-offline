"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DatabaseBackup, FlaskConical, RotateCcw, Trash2, Upload } from "lucide-react";
import { Panel, btnDanger, btnGhost, btnPrimary } from "@/components/ui/form";
import { tw } from "@/lib/tw";
import { clearSales, getMeta, importBackup, loadDemo, resetAll } from "@/lib/store";
import { isCancel, shareBackup } from "@/lib/backup";
import { getDb } from "@/lib/db";
import { clearSession, readSession } from "@/lib/session";
import { fmt } from "@/lib/money";
import { fmtDate, fmtTime } from "@/lib/time";

type Danger = "" | "clear" | "reset" | "restore";

/** Everything is stored on this iPad only, so backups are the owner's safety net. */
export function DataPanel() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState<{ bills: number; lastBackup?: number } | null>(null);
  const [armed, setArmed] = useState<Danger>("");
  const [pending, setPending] = useState<unknown>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setStats({ bills: await getDb().orders.count(), lastBackup: await getMeta<number>("lastBackupAt") });
  }
  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(""), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  async function job(fn: () => Promise<string | void>) {
    setBusy(true);
    setMsg("");
    try {
      const m = await fn();
      if (m) setMsg(m);
    } catch (e) {
      if (!isCancel(e)) setMsg((e as Error).message || "ບໍ່ສຳເລັດ");
    } finally {
      setBusy(false);
      setArmed("");
      refresh();
    }
  }

  const backup = () =>
    job(async () => {
      await shareBackup();
      return "ສ້າງໄຟລ໌ສຳຮອງແລ້ວ — ເກັບໄວ້ໃນ LINE, Google Drive ຫຼື Files";
    });

  async function pickFile(f?: File) {
    if (!f) return;
    try {
      setPending(JSON.parse(await f.text()));
      setArmed("restore");
      setMsg(`ໄຟລ໌: ${f.name} — ແຕະ “ຢືນຢັນກູ້ຄືນ” ເພື່ອແທນຂໍ້ມູນທັງໝົດໃນເຄື່ອງນີ້`);
    } catch {
      setMsg("ອ່ານໄຟລ໌ບໍ່ໄດ້ — ຕ້ອງເປັນໄຟລ໌ .json ທີ່ສຳຮອງຈາກ Dalin POS");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  const confirmBtn = (key: Danger, label: string, confirmLabel: string, onConfirm: () => void, Icon: typeof Trash2) => (
    <button
      disabled={busy}
      onClick={() => (armed === key ? onConfirm() : setArmed(key))}
      className={armed === key ? tw(btnPrimary, "bg-chili active:bg-chili") : btnDanger}
    >
      <Icon className="size-5" /> {armed === key ? confirmLabel : label}
    </button>
  );

  return (
    <Panel title="ຂໍ້ມູນໃນເຄື່ອງ ແລະ ການສຳຮອງ" className="lg:col-span-2 scroll-mt-6">
      <div id="backup" className="grid gap-5 px-5 pb-5 lg:grid-cols-2">
        <div>
          <p className="text-[15px]">
            ຂໍ້ມູນທັງໝົດ (ສິນຄ້າ, ບິນ, ຄ່າໃຊ້ຈ່າຍ) ເກັບຢູ່ໃນ <b>iPad ເຄື່ອງນີ້ເທົ່ານັ້ນ</b>. ຖ້າເຄື່ອງເສຍ ຫຼື ລຶບແອັບ ຂໍ້ມູນຈະຫາຍ —
            ສະນັ້ນ ສຳຮອງທຸກອາທິດ ແລ້ວສົ່ງໄຟລ໌ເກັບໄວ້ບ່ອນອື່ນ.
          </p>
          <p className="mt-3 text-sm text-muted">
            ບິນໃນເຄື່ອງ: <span className="num">{fmt(stats?.bills ?? 0)}</span> ບິນ
            <br />
            ສຳຮອງລ່າສຸດ: {stats?.lastBackup ? `${fmtDate(stats.lastBackup)} ${fmtTime(stats.lastBackup)}` : "ຍັງບໍ່ເຄີຍ"}
          </p>
          <p className="mt-3 text-sm text-muted">ໃຊ້ແອັບຜ່ານໄອຄອນ Dalin POS ໃນໜ້າຈໍສະເໝີ — ຂໍ້ມູນໃນໄອຄອນ ແລະ ໃນ Safari ແຍກກັນ.</p>
        </div>

        <div className="grid content-start gap-2.5">
          <button onClick={backup} disabled={busy} className={tw(btnPrimary, "h-14 text-lg")}>
            <DatabaseBackup className="size-5" /> ສຳຮອງຂໍ້ມູນ (ສົ່ງເປັນໄຟລ໌)
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
          {armed === "restore" ? (
            <button
              disabled={busy}
              onClick={() =>
                job(async () => {
                  await importBackup(pending);
                  clearSession();
                  router.replace("/login/");
                })
              }
              className={tw(btnPrimary, "bg-chili active:bg-chili")}
            >
              <Upload className="size-5" /> ຢືນຢັນກູ້ຄືນ (ແທນຂໍ້ມູນທັງໝົດ)
            </button>
          ) : (
            <button onClick={() => fileRef.current?.click()} disabled={busy} className={btnGhost}>
              <Upload className="size-5" /> ກູ້ຄືນຈາກໄຟລ໌ສຳຮອງ
            </button>
          )}

          <div className="mt-3 grid gap-2 border-t border-line pt-4">
            <button
              disabled={busy || !!stats?.bills}
              onClick={() =>
                job(async () => {
                  const n = await loadDemo(readSession()!);
                  return `ໃສ່ບິນຕົວຢ່າງ ${fmt(n)} ບິນແລ້ວ — ເບິ່ງໄດ້ທີ່ ພາບລວມ. ກ່ອນເປີດຮ້ານແທ້ ໃຫ້ກົດ “ລຶບບິນທັງໝົດ”.`;
                })
              }
              className={btnGhost}
              title="ໃຊ້ໄດ້ສະເພາະຕອນທີ່ຍັງບໍ່ມີບິນ"
            >
              <FlaskConical className="size-5" /> ໃສ່ຂໍ້ມູນຕົວຢ່າງ (ທົດລອງ)
            </button>
            {confirmBtn("clear", "ລຶບບິນ ແລະ ຄ່າໃຊ້ຈ່າຍທັງໝົດ", "ແຕະອີກເທື່ອເພື່ອລຶບ", () => job(async () => {
              await clearSales();
              return "ລຶບບິນ ແລະ ຄ່າໃຊ້ຈ່າຍແລ້ວ (ສິນຄ້າ ແລະ ຜູ້ໃຊ້ຍັງຢູ່)";
            }), Trash2)}
            {confirmBtn("reset", "ລ້າງທຸກຢ່າງ ເລີ່ມໃໝ່", "ແຕະອີກເທື່ອ — ລຶບໝົດ ກັບໄປ PIN 1234", () => job(async () => {
              await resetAll();
              clearSession();
              router.replace("/login/");
            }), RotateCcw)}
          </div>
          {msg && <p className="rounded-xl bg-paper px-4 py-3 text-[15px]">{msg}</p>}
        </div>
      </div>
    </Panel>
  );
}
