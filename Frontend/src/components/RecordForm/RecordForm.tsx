import { type FormEvent, useEffect, useRef, useState } from "react";
import { ApiError } from "../../api";
import type { Field, ResourceDef, Row } from "../Schema/Schema";

export interface Option { value: string | number; label: string }

interface Props {
  resource: ResourceDef;
  mode: "create" | "edit";
  /** The record being edited (edit mode only) */
  initial?: Row;
  /** Suggested id for a new record (shown when the id is typed in by hand) */
  nextId: number;
  /** Choices for a foreign-key field */
  optionsFor: (field: Field) => Option[];
  /** Should save the record. Throw an ApiError to show a server message in the form */
  onSubmit: (payload: Row) => Promise<void>;
  onClose: () => void;
}

const toInput = (f: Field, v: unknown): string =>
  v === null || v === undefined ? "" : f.type === "date" ? String(v).slice(0, 10) : String(v);

function validateField(f: Field, raw: string): string {
  const v = raw.trim();
  if (!v) return f.required ? `${f.label} is required.` : "";
  if ((f.type === "int" || f.fk) && !/^-?\d+$/.test(v)) return "Enter a whole number.";
  if (f.type === "decimal" && Number.isNaN(Number(v))) return "Enter a valid number.";
  if (f.type === "int" || f.type === "decimal") {
    const n = Number(v);
    if (f.min !== undefined && n < f.min) return `Must be ${f.min} or more.`;
    if (f.max !== undefined && n > f.max) return `Must be ${f.max} or less.`;
  }
  if (f.type === "text" && f.maxLength && v.length > f.maxLength) return `Use ${f.maxLength} characters or fewer.`;
  if (f.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return "Pick a valid date.";
  return "";
}

const inputCls = (invalid: boolean) =>
  "w-full rounded-lg border bg-white px-3.5 py-2.5 text-[15px] text-[#12201a] outline-none transition focus:ring-2 " +
  "disabled:cursor-not-allowed disabled:bg-[#eef1ec] disabled:text-[#5d6e64] " +
  (invalid
    ? "border-[#a4161a] focus:border-[#a4161a] focus:ring-[#e6b8ba]"
    : "border-[#d5dcd3] focus:border-[#14352a] focus:ring-[#d9c38a]");

export default function RecordForm({ resource, mode, initial, nextId, optionsFor, onSubmit, onClose }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const f of resource.fields) {
      if (mode === "edit") out[f.name] = toInput(f, initial?.[f.name]);
      else if (f.name === resource.pk && !f.fk) out[f.name] = String(nextId);
      else out[f.name] = f.default ?? "";
    }
    return out;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus the first editable field, lock page scroll, close on Escape
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>("input:not([disabled]), select:not([disabled])")?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !saving) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

  const set = (name: string, value: string) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: "" } : e));
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const found: Record<string, string> = {};
    for (const f of resource.fields) {
      if (mode === "edit" && f.name === resource.pk) continue;
      const msg = validateField(f, values[f.name]);
      if (msg) found[f.name] = msg;
    }
    Object.assign(found, resource.validate?.(values) ?? {});
    if (Object.keys(found).length) {
      setErrors(found);
      const first = resource.fields.find((f) => found[f.name]);
      if (first) document.getElementById(`f-${first.name}`)?.focus();
      return;
    }

    const payload: Row = {};
    for (const f of resource.fields) {
      if (mode === "edit" && f.name === resource.pk) continue;
      const v = values[f.name].trim();
      payload[f.name] = v === "" ? null : f.type === "text" || f.type === "date" ? v : Number(v);
    }

    setSaving(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.field && resource.fields.some((f) => f.name === apiErr.field)) {
        setErrors({ [apiErr.field]: apiErr.message });
        document.getElementById(`f-${apiErr.field}`)?.focus();
      } else {
        setFormError(apiErr?.message ?? "Something went wrong. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const title = `${mode === "create" ? "Add" : "Edit"} ${resource.singular.toLowerCase()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c241c]/60 p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="form-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="border-b-4 border-[#a4161a] bg-[#14352a] px-6 py-4 text-white">
          <h2 id="form-title" className="font-['Barlow_Condensed'] text-3xl font-bold leading-none">{title}</h2>
          <p className="mt-1 text-sm text-[#a9bdb1]">
            {mode === "edit" ? "Change the details and save." : "Fill in the details below."} Fields marked
            <span className="text-[#d9c38a]"> * </span>are required.
          </p>
        </div>

        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="grid flex-1 gap-x-4 gap-y-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
            {formError && (
              <div role="alert" className="rounded-lg border border-[#e6b8ba] bg-[#fbeeee] px-4 py-3 text-sm text-[#7a1013] sm:col-span-2">
                {formError}
              </div>
            )}

            {resource.fields.map((f) => {
              const locked = mode === "edit" && f.name === resource.pk;
              const err = errors[f.name];
              const common = {
                id: `f-${f.name}`,
                value: values[f.name],
                disabled: locked || saving,
                "aria-invalid": !!err,
                "aria-describedby": `m-${f.name}`,
              };
              return (
                <div key={f.name}>
                  <label htmlFor={`f-${f.name}`} className="mb-1.5 block text-sm font-semibold text-[#14352a]">
                    {f.label}{f.required && !locked && <span className="text-[#a4161a]"> *</span>}
                  </label>

                  {f.fk ? (
                    <select {...common} onChange={(e) => set(f.name, e.target.value)} className={inputCls(!!err)}>
                      <option value="">{f.required ? "Select…" : "— None —"}</option>
                      {optionsFor(f).map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
                    </select>
                  ) : f.type === "text" ? (
                    <>
                      <input {...common} type="text" maxLength={f.maxLength} list={f.options ? `l-${f.name}` : undefined}
                        onChange={(e) => set(f.name, e.target.value)} className={inputCls(!!err)} autoComplete="off" />
                      {f.options && <datalist id={`l-${f.name}`}>{f.options.map((o) => <option key={o} value={o} />)}</datalist>}
                    </>
                  ) : (
                    <input {...common}
                      type={f.type === "date" ? "date" : "number"}
                      step={f.type === "decimal" ? "0.01" : f.type === "int" ? "1" : undefined}
                      min={f.min} max={f.max}
                      onChange={(e) => set(f.name, e.target.value)} className={inputCls(!!err)} />
                  )}

                  <p id={`m-${f.name}`} role={err ? "alert" : undefined}
                    className={`mt-1 min-h-[1.1rem] text-xs ${err ? "text-[#a4161a]" : "text-[#5d6e64]"}`}>
                    {err ||
                      (locked ? "The ID can’t be changed." :
                       f.name === resource.pk && !f.fk && mode === "create" ? "Suggested next free ID." :
                       f.help)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 border-t border-[#d5dcd3] bg-[#f7f9f6] px-6 py-4">
            <button type="button" onClick={onClose} disabled={saving}
              className="rounded-lg border border-[#d5dcd3] bg-white px-5 py-2.5 font-medium text-[#14352a] hover:border-[#14352a] disabled:opacity-60">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 rounded-lg border-b-4 border-[#a4161a] bg-[#14352a] px-6 py-2.5 font-['Barlow_Condensed'] text-lg font-semibold tracking-widest text-white hover:bg-[#1d4a3a] disabled:cursor-not-allowed disabled:opacity-70">
              {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
              {saving ? "SAVING…" : mode === "create" ? "ADD RECORD" : "SAVE CHANGES"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}