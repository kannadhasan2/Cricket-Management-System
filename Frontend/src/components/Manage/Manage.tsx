import { useCallback, useEffect, useMemo, useState } from "react";
import AppHeader from "../AppHeader/AppHeader";
import RecordForm, { type Option } from "../RecordForm/RecordForm";
import { ApiError, createRow, deleteRow, listRows, updateRow } from "../../api";
import {
  type Field, type Row, GROUPS, RESOURCE_LIST, RESOURCES, formatDate, neededResources, rowLabel,
} from "../Schema/Schema";

const PAGE_SIZE = 12;
const num = new Intl.NumberFormat("en-IN");
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

type FormState = { mode: "create" | "edit"; row?: Row } | null;

export default function Manage() {
  const [path, setPath] = useState(RESOURCE_LIST[0].path);
  const def = RESOURCES[path];

  const [cache, setCache] = useState<Record<string, Row[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [form, setForm] = useState<FormState>(null);
  const [removing, setRemoving] = useState<Row | null>(null);
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "err" } | null>(null);

  /* ───── Loading ───── */

  const load = useCallback(async (paths: string[]) => {
    setLoading(true);
    setLoadError(null);
    const results = await Promise.allSettled(paths.map(async (p) => [p, await listRows(p)] as const));
    const next: Record<string, Row[]> = {};
    const failed: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") next[r.value[0]] = r.value[1];
      else failed.push(`${RESOURCES[paths[i]].label} (${(r.reason as Error).message})`);
    });
    setCache((c) => ({ ...c, ...next }));
    if (failed.length) setLoadError(`Couldn’t load: ${failed.join(", ")}.`);
    setLoading(false);
  }, []);

  useEffect(() => {
    setQuery("");
    setPage(0);
    load(neededResources(path));
  }, [path, load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ───── Lookups & display ───── */

  const rows = cache[path] ?? [];

  const index = useMemo(() => {
    const out: Record<string, Map<string, Row>> = {};
    for (const [p, list] of Object.entries(cache)) {
      out[p] = new Map(list.map((r) => [String(r[RESOURCES[p].pk]), r]));
    }
    return out;
  }, [cache]);

  const get = useCallback((p: string, id: unknown) => index[p]?.get(String(id)), [index]);
  const labelOf = useCallback((p: string, row: Row) => rowLabel(p, row, get), [get]);

  const cellText = useCallback((f: Field, row: Row): string => {
    const v = row[f.name];
    if (v === null || v === undefined || v === "") return "";
    if (f.fk) {
      const target = get(f.fk, v);
      return target ? labelOf(f.fk, target) : `#${v}`;
    }
    if (f.type === "date") return formatDate(v);
    if (f.money) return inr.format(Number(v));
    if (f.type === "int" && f.name !== def.pk) return num.format(Number(v));
    return String(v);
  }, [get, labelOf, def.pk]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => def.fields.some((f) => cellText(f, r).toLowerCase().includes(q)));
  }, [rows, query, def, cellText]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const recordName = (row: Row) => {
    const pkField = def.fields.find((f) => f.name === def.pk)!;
    return pkField.fk ? labelOf(path, row) : `${def.singular} #${row[def.pk]}`;
  };

  const nextId = useMemo(() => rows.reduce((m, r) => Math.max(m, Number(r[def.pk]) || 0), 0) + 1, [rows, def.pk]);

  const optionsFor = (mode: "create" | "edit") => (f: Field): Option[] => {
    if (!f.fk) return [];
    const target = RESOURCES[f.fk];
    let list = cache[f.fk] ?? [];
    // When the id itself is a link to another table (players, coaches, umpires), hide ones already added
    if (mode === "create" && f.name === def.pk) {
      const used = new Set(rows.map((r) => String(r[def.pk])));
      list = list.filter((r) => !used.has(String(r[target.pk])));
    }
    return list
      .map((r) => ({ value: r[target.pk] as string | number, label: labelOf(f.fk!, r) }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  };

  /* ───── Actions ───── */

  const save = async (payload: Row) => {
    if (form?.mode === "edit" && form.row) {
      await updateRow(path, form.row[def.pk], payload);
      setToast({ text: `${def.singular} updated.`, kind: "ok" });
    } else {
      await createRow(path, payload);
      setToast({ text: `${def.singular} added.`, kind: "ok" });
      setPage(Number.MAX_SAFE_INTEGER); // jump to the last page, where the new row appears
    }
    setForm(null);
    await load([path]);
  };

  const confirmDelete = async () => {
    if (!removing) return;
    await deleteRow(path, removing[def.pk]);
    setToast({ text: `${def.singular} deleted.`, kind: "ok" });
    setRemoving(null);
    await load([path]);
  };

  const pickResource = (p: string) => { if (p !== path) setPath(p); };

  /* ───── Render ───── */

  return (
    <div className="min-h-screen bg-[#f4f6f2] font-['IBM_Plex_Sans',system-ui,sans-serif] text-[#12201a]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');`}</style>
      <AppHeader />

      <main className="mx-auto max-w-7xl px-5 py-8">
        <p className="font-['Barlow_Condensed'] text-base font-semibold tracking-[0.2em] text-[#a4161a]">ADMIN</p>
        <h1 className="font-['Barlow_Condensed'] text-5xl font-bold leading-none text-[#14352a]">Manage data</h1>
        <p className="mt-2 max-w-2xl text-[#5d6e64]">Add, edit and delete records in any table. Changes are saved to the database straight away.</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[230px_1fr]">
          {/* Table picker: drop-down on small screens, grouped list on large ones */}
          <div>
            <label htmlFor="table-select" className="sr-only">Choose a table</label>
            <select id="table-select" value={path} onChange={(e) => pickResource(e.target.value)}
              className="w-full rounded-lg border border-[#d5dcd3] bg-white px-3.5 py-2.5 lg:hidden">
              {GROUPS.map((g) => (
                <optgroup key={g} label={g}>
                  {RESOURCE_LIST.filter((r) => r.group === g).map((r) => <option key={r.path} value={r.path}>{r.label}</option>)}
                </optgroup>
              ))}
            </select>

            <nav aria-label="Tables" className="hidden rounded-xl bg-[#14352a] p-3 text-[#e8efe9] lg:sticky lg:top-24 lg:block">
              {GROUPS.map((g) => (
                <div key={g} className="mb-3 last:mb-0">
                  <h2 className="mb-1 px-2 font-['Barlow_Condensed'] text-sm font-semibold tracking-[0.12em] text-[#d9c38a]">{g.toUpperCase()}</h2>
                  {RESOURCE_LIST.filter((r) => r.group === g).map((r) => (
                    <button key={r.path} onClick={() => pickResource(r.path)} aria-current={r.path === path}
                      className={`block w-full rounded-md border-l-[3px] px-3 py-1.5 text-left text-sm transition ${
                        r.path === path ? "border-[#a4161a] bg-[#1d4a3a] font-semibold" : "border-transparent hover:bg-[#1d4a3a]"}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              ))}
            </nav>
          </div>

          <section className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 rounded-t-xl border-b-4 border-[#a4161a] bg-[#14352a] px-5 py-4 text-white">
              <div className="mr-auto">
                <h2 className="font-['Barlow_Condensed'] text-3xl font-bold leading-none">{def.label}</h2>
                <p className="mt-1 text-sm text-[#a9bdb1]">{num.format(rows.length)} {rows.length === 1 ? "record" : "records"}</p>
              </div>
              <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }}
                placeholder={`Search ${def.label.toLowerCase()}`} aria-label={`Search ${def.label}`}
                className="w-full rounded-lg border border-[#2b6150] bg-[#1d4a3a] px-3.5 py-2 text-white placeholder:text-[#9db3a6] sm:w-64" />
              <button onClick={() => setForm({ mode: "create" })} disabled={loading && !rows.length}
                className="rounded-lg border-b-4 border-[#7d0f12] bg-[#a4161a] px-5 py-2 font-['Barlow_Condensed'] text-lg font-semibold tracking-widest hover:bg-[#8a1216] disabled:opacity-60">
                + ADD {def.singular.toUpperCase()}
              </button>
            </div>

            {loadError && (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-t-0 border-[#e6b8ba] bg-[#fbeeee] px-5 py-3 text-sm text-[#7a1013]">
                <span>{loadError} Check that your API is running and the routes match.</span>
                <button onClick={() => load(neededResources(path))} className="rounded-md border border-[#a4161a] px-3 py-1 font-medium hover:bg-white">Try again</button>
              </div>
            )}

            <div className="overflow-x-auto border border-t-0 border-[#d5dcd3] bg-white" aria-busy={loading}>
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-[#e9eee7] text-left font-['Barlow_Condensed'] text-base tracking-wider text-[#14352a]">
                  <tr>
                    {def.fields.map((f) => <th key={f.name} className="whitespace-nowrap px-4 py-3">{f.label.toUpperCase()}</th>)}
                    <th className="px-4 py-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && !rows.length ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-[#e3e8e1]">
                        <td colSpan={def.fields.length + 1} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-[#e3e8e1]" /></td>
                      </tr>
                    ))
                  ) : visible.length === 0 ? (
                    <tr>
                      <td colSpan={def.fields.length + 1} className="px-4 py-14 text-center text-[#5d6e64]">
                        {query ? <>No records match “{query}”.</> : <>No {def.label.toLowerCase()} yet. Use <strong>Add {def.singular.toLowerCase()}</strong> to create the first one.</>}
                      </td>
                    </tr>
                  ) : (
                    visible.map((row) => (
                      <tr key={String(row[def.pk])} className="border-b border-[#e3e8e1] even:bg-[#f7f9f6] hover:bg-[#eef3e9]">
                        {def.fields.map((f) => {
                          const text = cellText(f, row);
                          const numeric = f.type === "int" && !f.fk || f.type === "decimal";
                          return (
                            <td key={f.name} className={`px-4 py-2.5 ${numeric ? "text-right tabular-nums" : ""} ${f.name === def.pk ? "font-semibold text-[#14352a]" : ""}`}>
                              {text || <span className="text-[#aab6ae]">–</span>}
                            </td>
                          );
                        })}
                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                          <button onClick={() => setForm({ mode: "edit", row })} aria-label={`Edit ${recordName(row)}`}
                            className="rounded-md border border-[#d5dcd3] px-3 py-1 font-medium text-[#14352a] hover:border-[#14352a]">Edit</button>
                          <button onClick={() => setRemoving(row)} aria-label={`Delete ${recordName(row)}`}
                            className="ml-2 rounded-md border border-[#e6b8ba] px-3 py-1 font-medium text-[#a4161a] hover:bg-[#fbeeee]">Delete</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm text-[#5d6e64]">
              <span>Showing {filtered.length ? safePage * PAGE_SIZE + 1 : 0}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {num.format(filtered.length)}</span>
              <div className="flex items-center gap-3">
                <button disabled={safePage === 0} onClick={() => setPage(safePage - 1)}
                  className="rounded-md bg-[#14352a] px-4 py-1.5 font-medium text-white disabled:cursor-not-allowed disabled:bg-[#c5cfc7]">Previous</button>
                <span className="tabular-nums text-[#12201a]">Page {safePage + 1} of {pages}</span>
                <button disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}
                  className="rounded-md bg-[#14352a] px-4 py-1.5 font-medium text-white disabled:cursor-not-allowed disabled:bg-[#c5cfc7]">Next</button>
              </div>
            </footer>
          </section>
        </div>
      </main>

      {form && (
        <RecordForm
          // New key for every record so the form always starts fresh
          key={`${path}-${form.mode}-${form.row ? form.row[def.pk] : "new"}`}
          resource={def} mode={form.mode} initial={form.row} nextId={nextId}
          optionsFor={optionsFor(form.mode)} onSubmit={save} onClose={() => setForm(null)}
        />
      )}

      {removing && (
        <ConfirmDelete
          title={`Delete ${def.singular.toLowerCase()}?`}
          name={recordName(removing)}
          onConfirm={confirmDelete}
          onClose={() => setRemoving(null)}
        />
      )}

      {toast && (
        <div role="status" aria-live="polite"
          className={`fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg ${toast.kind === "ok" ? "bg-[#14352a]" : "bg-[#a4161a]"}`}>
          {toast.kind === "ok" ? "✓ " : ""}{toast.text}
        </div>
      )}
    </div>
  );
}

/* ───────────── Delete confirmation ───────────── */

function ConfirmDelete({ title, name, onConfirm, onClose }: {
  title: string; name: string; onConfirm: () => Promise<void>; onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c241c]/60 p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="del-title" aria-describedby="del-desc"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="del-title" className="font-['Barlow_Condensed'] text-3xl font-bold leading-none text-[#14352a]">{title}</h2>
        <p id="del-desc" className="mt-3 text-[#5d6e64]">
          <strong className="text-[#12201a]">{name}</strong> will be permanently removed. This can’t be undone.
        </p>
        {error && (
          <div role="alert" className="mt-4 rounded-lg border border-[#e6b8ba] bg-[#fbeeee] px-4 py-3 text-sm text-[#7a1013]">{error}</div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} disabled={busy}
            className="rounded-lg border border-[#d5dcd3] px-5 py-2.5 font-medium text-[#14352a] hover:border-[#14352a] disabled:opacity-60">Cancel</button>
          <button onClick={run} disabled={busy} autoFocus
            className="flex items-center gap-2 rounded-lg border-b-4 border-[#7d0f12] bg-[#a4161a] px-6 py-2.5 font-['Barlow_Condensed'] text-lg font-semibold tracking-widest text-white hover:bg-[#8a1216] disabled:opacity-70">
            {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
            {busy ? "DELETING…" : "DELETE"}
          </button>
        </div>
      </div>
    </div>
  );
}