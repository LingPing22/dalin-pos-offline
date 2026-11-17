"use client";
import { tw } from "@/lib/tw";
import { useRef, useState } from "react";
import { Check, ImagePlus, KeyRound, UserPlus } from "lucide-react";
import { Field, PageHeader, Panel, btnDanger, btnGhost, btnPrimary, inputCls, resizeImage } from "@/components/ui/form";
import { Sheet } from "@/components/ui/Sheet";
import { METHOD_LABEL, type PaymentMethod, type ShopSettings } from "@/lib/types";
import { addUser, listUsers, saveSettings, updateUser } from "@/lib/store";
import { readSession } from "@/lib/session";

type U = { id: number; name: string; role: "owner" | "cashier"; active: boolean };

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-4 rounded-xl bg-white px-4 py-2 ring-1 ring-line">
      <span>
        <span className="block">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-6 shrink-0 accent-[var(--color-ink)]" />
    </label>
  );
}

export function SettingsForm({ initial, initialUsers, extra }: { initial: ShopSettings; initialUsers: U[]; extra?: React.ReactNode }) {
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState<"" | "saving" | "done" | string>("");
  const [users, setUsers] = useState(initialUsers);
  const [pinFor, setPinFor] = useState<U | "new" | null>(null);
  const qrRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ShopSettings>(k: K, v: Partial<ShopSettings[K]>) =>
    setS((prev) => ({ ...prev, [k]: typeof v === "object" && v !== null ? { ...(prev[k] as object), ...v } : v }));

  async function save() {
    setSaved("saving");
    try {
      setS(await saveSettings(s));
    } catch (e) {
      return setSaved((e as Error).message || "ບັນທຶກບໍ່ສຳເລັດ");
    }
    setSaved("done");
    setTimeout(() => setSaved(""), 2500);
  }

  async function reloadUsers() {
    setUsers(await listUsers());
  }
  async function toggleUser(u: U) {
    try {
      alertInline("");
      await updateUser(u.id, readSession()!, { active: !u.active });
    } catch (e) {
      alertInline((e as Error).message);
    }
    reloadUsers();
  }
  const [userErr, setUserErr] = useState("");
  const alertInline = (m?: string) => setUserErr(m ?? "");

  return (
    <main className="pb-28">
      <PageHeader title="ຕັ້ງຄ່າ" sub="ຂໍ້ມູນຮ້ານ, ພາສີ, ຄ່າທຳມະນຽມ, ໃບບິນ ແລະ ຜູ້ໃຊ້" />
      <div className="grid gap-5 px-6 lg:grid-cols-2 lg:px-8">
        <Panel title="ຂໍ້ມູນຮ້ານ (ສະແດງໃນໃບບິນ)">
          <div className="grid gap-4 px-5 pb-5">
            <Field label="ຊື່ຮ້ານ"><input value={s.shop.name} onChange={(e) => set("shop", { name: e.target.value })} className={inputCls} /></Field>
            <Field label="ທີ່ຢູ່"><input value={s.shop.address} onChange={(e) => set("shop", { address: e.target.value })} className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ເບີໂທ"><input value={s.shop.phone} onChange={(e) => set("shop", { phone: e.target.value })} className={inputCls} inputMode="tel" /></Field>
              <Field label="ເລກປະຈຳຕົວຜູ້ເສຍອາກອນ"><input value={s.shop.taxId} onChange={(e) => set("shop", { taxId: e.target.value })} className={inputCls} /></Field>
            </div>
            <Field label="ຂໍ້ຄວາມທ້າຍໃບບິນ"><input value={s.shop.footer} onChange={(e) => set("shop", { footer: e.target.value })} className={inputCls} /></Field>
          </div>
        </Panel>

        <div className="grid content-start gap-5">
          <Panel title="ພາສີມູນຄ່າເພີ່ມ (VAT)">
            <div className="grid gap-3 px-5 pb-5">
              <Toggle checked={s.tax.enabled} onChange={(v) => set("tax", { enabled: v })} label="ຄິດໄລ່ VAT" />
              <div className="grid grid-cols-[140px_1fr] items-end gap-3">
                <Field label="ອັດຕາ (%)">
                  <input inputMode="decimal" value={s.tax.rate} onChange={(e) => set("tax", { rate: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })} className={tw(inputCls, "num")} disabled={!s.tax.enabled} />
                </Field>
                <Toggle checked={s.tax.inclusive} onChange={(v) => set("tax", { inclusive: v })} label="ລາຄາສິນຄ້າລວມ VAT ແລ້ວ" />
              </div>
              <p className="text-sm text-muted">ກວດສອບອັດຕາ VAT ປັດຈຸບັນກັບກົມສ່ວຍສາອາກອນ ກ່ອນເປີດໃຊ້ງານ.</p>
            </div>
          </Panel>

          <Panel title="ຄ່າທຳມະນຽມທີ່ຮ້ານຈ່າຍ (%)">
            <div className="grid grid-cols-3 gap-3 px-5 pb-5">
              {(["cash", "qr", "card"] as PaymentMethod[]).map((m) => (
                <Field key={m} label={METHOD_LABEL[m]}>
                  <input
                    inputMode="decimal"
                    value={s.fees[m]}
                    onChange={(e) => set("fees", { [m]: e.target.value.replace(/[^\d.]/g, "") as unknown as number })}
                    className={tw(inputCls, "num")}
                  />
                </Field>
              ))}
              <p className="col-span-3 text-sm text-muted">ໃຊ້ຫັກອອກຈາກຍອດຂາຍ ເພື່ອສະແດງລາຍຮັບສຸດທິໃນໜ້າພາບລວມ. ບິນເກົ່າໃຊ້ອັດຕາຕອນຂາຍ.</p>
            </div>
          </Panel>
        </div>

        <Panel title="ໃບບິນ ແລະ ເຄື່ອງພິມ">
          <div className="grid gap-4 px-5 pb-5">
            <Field label="ຂະໜາດເຈ້ຍ">
              <div className="grid grid-cols-2 gap-2">
                {([58, 80] as const).map((w) => (
                  <button key={w} type="button" onClick={() => set("receipt", { width: w })} className={`h-12 rounded-xl font-medium ${s.receipt.width === w ? "bg-ink text-white" : "bg-white ring-1 ring-line"}`}>
                    {w} mm
                  </button>
                ))}
              </div>
            </Field>
            <Field label="ຕົວອັກສອນນຳໜ້າເລກບິນ" hint={`ຕົວຢ່າງ: ${s.billPrefix || "DL"}-261117-0001`}>
              <input value={s.billPrefix} onChange={(e) => setS({ ...s, billPrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) })} className={tw(inputCls, "num")} />
            </Field>
          </div>
        </Panel>

        <Panel title="QR ຮັບເງິນ">
          <div className="flex gap-5 px-5 pb-5">
            <button type="button" onClick={() => qrRef.current?.click()} className="grid size-36 shrink-0 place-items-center overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
              {s.qrImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.qrImage} alt="QR ຂອງຮ້ານ" className="size-full object-contain" />
              ) : (
                <ImagePlus className="size-8 text-muted" />
              )}
            </button>
            <div className="grid content-start gap-2">
              <p className="text-sm text-muted">ບັນທຶກຮູບ QR ຮັບເງິນຈາກແອັບທະນາຄານຂອງຮ້ານ ແລ້ວອັບໂຫຼດບ່ອນນີ້. ລູກຄ້າຈະສະແກນ ແລະ ໃສ່ຈຳນວນເງິນເອງ.</p>
              <input ref={qrRef} type="file" accept="image/*" className="hidden" onChange={async (e) => e.target.files?.[0] && setS({ ...s, qrImage: await resizeImage(e.target.files[0], 900, 0.92) })} />
              <div className="flex gap-2">
                <button type="button" onClick={() => qrRef.current?.click()} className={btnGhost}>{s.qrImage ? "ປ່ຽນຮູບ" : "ອັບໂຫຼດ QR"}</button>
                {s.qrImage && <button type="button" onClick={() => setS({ ...s, qrImage: null })} className={btnDanger}>ລຶບ</button>}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="ຜູ້ໃຊ້ ແລະ ລະຫັດ PIN" className="lg:col-span-2" action={<button onClick={() => setPinFor("new")} className={tw(btnGhost, "h-10")}><UserPlus className="size-4" /> ເພີ່ມຜູ້ໃຊ້</button>}>
          <ul className="px-5 pb-4">
            {users.map((u) => (
              <li key={u.id} className={`flex flex-wrap items-center gap-3 border-b border-line py-3 last:border-0 ${u.active ? "" : "text-muted"}`}>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{u.name}</span>
                  <span className="ml-2 text-sm text-muted">{u.role === "owner" ? "ຜູ້ຈັດການ" : "ພະນັກງານຂາຍ"}{u.active ? "" : ", ປິດໃຊ້ງານ"}</span>
                </span>
                <button onClick={() => setPinFor(u)} className={tw(btnGhost, "h-10")}><KeyRound className="size-4" /> ປ່ຽນ PIN</button>
                <button onClick={() => toggleUser(u)} className={tw(u.active ? btnDanger : btnGhost, "h-10")}>{u.active ? "ປິດໃຊ້ງານ" : "ເປີດໃຊ້ງານ"}</button>
              </li>
            ))}
          </ul>
          {userErr && <p className="px-5 pb-4 text-chili">{userErr}</p>}
        </Panel>
        {extra}
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-24 right-0 z-30 flex items-center justify-end gap-4 border-t border-line bg-white/95 px-8 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        {saved && saved !== "saving" && saved !== "done" && <span className="text-chili">{saved}</span>}
        {saved === "done" && <span className="flex items-center gap-1 text-leaf"><Check className="size-5" /> ບັນທຶກແລ້ວ</span>}
        <button onClick={save} disabled={saved === "saving"} className={tw(btnPrimary, "min-w-44")}>
          {saved === "saving" ? "ກຳລັງບັນທຶກ…" : "ບັນທຶກການຕັ້ງຄ່າ"}
        </button>
      </div>

      <UserSheet target={pinFor} onClose={() => setPinFor(null)} onDone={reloadUsers} />
    </main>
  );
}

function UserSheet({ target, onClose, onDone }: { target: U | "new" | null; onClose: () => void; onDone: () => void }) {
  const isNew = target === "new";
  const [name, setName] = useState("");
  const [role, setRole] = useState<"owner" | "cashier">("cashier");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  async function submit() {
    setErr("");
    try {
      if (isNew) await addUser(name, role, pin);
      else await updateUser((target as U).id, readSession()!, { pin });
    } catch (e) {
      return setErr((e as Error).message || "ບໍ່ສຳເລັດ");
    }
    setName("");
    setPin("");
    onClose();
    onDone();
  }
  return (
    <Sheet open={!!target} onClose={onClose} title={isNew ? "ເພີ່ມຜູ້ໃຊ້" : `ປ່ຽນ PIN: ${(target as U | null)?.name ?? ""}`} width="max-w-md">
      <div className="grid gap-4 p-6">
        {isNew && (
          <>
            <Field label="ຊື່"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
            <Field label="ສິດ">
              <div className="grid grid-cols-2 gap-2">
                {(["cashier", "owner"] as const).map((r) => (
                  <button key={r} type="button" onClick={() => setRole(r)} className={`h-12 rounded-xl font-medium ${role === r ? "bg-ink text-white" : "bg-white ring-1 ring-line"}`}>
                    {r === "owner" ? "ຜູ້ຈັດການ" : "ພະນັກງານຂາຍ"}
                  </button>
                ))}
              </div>
            </Field>
          </>
        )}
        <Field label="PIN ໃໝ່ (ຕົວເລກ 4-6 ໂຕ)">
          <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" type="password" autoComplete="new-password" className={tw(inputCls, "num tracking-[0.4em]")} />
        </Field>
        {err && <p className="text-chili">{err}</p>}
        <button onClick={submit} disabled={pin.length < 4 || (isNew && !name)} className={tw(btnPrimary, "h-14")}>
          ບັນທຶກ
        </button>
      </div>
    </Sheet>
  );
}
