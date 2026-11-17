"use client";
import { tw } from "@/lib/tw";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Field, PageHeader, Panel, btnGhost, btnPrimary, inputCls } from "@/components/ui/form";
import { fmt } from "@/lib/money";
import { TZ_OFFSET_MS, fmtDate, fmtMonthKey, toDateKey } from "@/lib/time";
import type { Expense } from "@/lib/db";
import { addExpense, deleteExpense, listExpenses } from "@/lib/store";

const PRESETS = ["ນ້ຳກ້ອນ", "ແກັສ", "ວັດຖຸດິບ", "ບັນຈຸພັນ", "ຄ່າຂົນສົ່ງ", "ໄຟຟ້າ-ນ້ຳປະປາ", "ຄ່າເຊົ່າ", "ເງິນເດືອນ", "ອື່ນໆ"];

function shiftMonth(m: string, n: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function ExpenseManager() {
  const today = toDateKey(Date.now());
  const [month, setMonth] = useState(today.slice(0, 7));
  const [rows, setRows] = useState<Expense[] | null>(null);
  const [form, setForm] = useState({ date: today, category: PRESETS[0], amount: "", note: "" });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setRows(await listExpenses(month));
  }, [month]);
  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    setSaving(true);
    setErr("");
    try {
      await addExpense(form);
    } catch (e) {
      setSaving(false);
      return setErr((e as Error).message || "ບັນທຶກບໍ່ສຳເລັດ");
    }
    setSaving(false);
    setForm({ ...form, amount: "", note: "" });
    setMonth(form.date.slice(0, 7));
    load();
  }
  async function remove(id: number) {
    await deleteExpense(id);
    load();
  }

  const total = rows?.reduce((s, r) => s + r.amount, 0) ?? 0;
  const groups = new Map<string, Expense[]>();
  for (const r of rows ?? []) {
    const k = toDateKey(r.date);
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }

  return (
    <main className="pb-10">
      <PageHeader title="ຄ່າໃຊ້ຈ່າຍ" sub="ຄ່າໃຊ້ຈ່າຍຈິປາຖະໜາຂອງຮ້ານ — ຄ່າທຳມະນຽມບັດ/QR ແລະ VAT ລະບົບຫັກໃຫ້ເອງ" />
      <div className="grid gap-5 px-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <Panel title="ບັນທຶກລາຍຈ່າຍ" className="self-start">
          <div className="grid gap-4 px-5 pb-5">
            <Field label="ປະເພດ">
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm({ ...form, category: p })}
                    className={`h-10 rounded-xl px-3 text-[15px] ${form.category === p ? "bg-ink text-white" : "bg-paper ring-1 ring-line"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="ຈຳນວນເງິນ (₭)">
              <input
                inputMode="numeric"
                value={form.amount ? fmt(Number(form.amount)) : ""}
                onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                placeholder="0"
                className={tw(inputCls, "num h-14 text-2xl font-semibold")}
              />
            </Field>
            <Field label="ລາຍລະອຽດ (ບໍ່ບັງຄັບ)">
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputCls} placeholder="ເຊັ່ນ: ນ້ຳກ້ອນ 3 ຖົງ" />
            </Field>
            <Field label="ວັນທີ">
              <input type="date" value={form.date} max={today} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
            </Field>
            {err && <p className="text-chili">{err}</p>}
            <button onClick={add} disabled={saving || !form.amount} className={tw(btnPrimary, "h-14 text-lg")}>
              ບັນທຶກລາຍຈ່າຍ
            </button>
          </div>
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="ເດືອນກ່ອນ" className={tw(btnGhost, "h-10 w-10 px-0")}><ChevronLeft className="size-5" /></button>
              <span className="min-w-36 text-center">{fmtMonthKey(month)}</span>
              <button onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= today.slice(0, 7)} aria-label="ເດືອນຕໍ່ໄປ" className={tw(btnGhost, "h-10 w-10 px-0")}><ChevronRight className="size-5" /></button>
            </span>
          }
          action={<span className="num text-xl font-semibold">{fmt(total)} ₭</span>}
        >
          {rows === null ? (
            <p className="px-5 pb-5 text-muted">ກຳລັງໂຫຼດ…</p>
          ) : rows.length === 0 ? (
            <p className="px-5 pb-5 text-muted">ຍັງບໍ່ມີລາຍຈ່າຍໃນເດືອນນີ້</p>
          ) : (
            <div className="px-5 pb-3">
              {[...groups].map(([day, list]) => (
                <section key={day} className="border-t border-line py-3 first:border-0">
                  <h3 className="mb-1 flex justify-between text-sm text-muted">
                    <span>{fmtDate(Date.parse(day) - TZ_OFFSET_MS + 12 * 3600_000)}</span>
                    <span className="num">{fmt(list.reduce((s, r) => s + r.amount, 0))}</span>
                  </h3>
                  <ul>
                    {list.map((e) => (
                      <li key={e.id} className="flex items-center gap-3 py-1.5">
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">{e.category}</span>
                          {e.note && <span className="ml-2 text-muted">{e.note}</span>}
                        </span>
                        <span className="num font-semibold">{fmt(e.amount)}</span>
                        <button onClick={() => e.id && remove(e.id)} aria-label="ລຶບ" className="grid size-10 place-items-center rounded-lg text-muted active:bg-chili-faint active:text-chili">
                          <Trash2 className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </main>
  );
}
