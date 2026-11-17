/** Small shared form primitives for the back office */
export const inputCls =
  "h-12 w-full rounded-xl bg-white px-4 ring-1 ring-line outline-none focus:ring-2 focus:ring-ink-soft disabled:bg-paper";
export const btnPrimary =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-ink px-5 font-semibold text-white active:bg-ink-soft disabled:opacity-40";
export const btnGhost =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 font-medium ring-1 ring-line active:bg-ink-faint disabled:opacity-40";
export const btnDanger =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 font-medium text-chili active:bg-chili-faint disabled:opacity-40";

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 px-6 pb-5 pt-7 lg:px-8">
      <div>
        <h1 className="text-[28px] font-semibold leading-tight">{title}</h1>
        {sub && <p className="mt-1 text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

export function Panel({ title, action, children, className = "" }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white ring-1 ring-line ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Read a picture, shrink it in the browser, return a small data URL (keeps the database light) */
export async function resizeImage(file: File, max = 480, quality = 0.82): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
