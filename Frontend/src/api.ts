import { authFetch } from "./components/Auth/Auth";
import type { Row } from "./components/Schema/Schema";

export class ApiError extends Error {
  status: number;
  /** Name of the form field the server blames, when it knows (for example a duplicate name) */
  field?: string;
  constructor(message: string, status = 0, field?: string) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

const JSON_HEADERS = { "Content-Type": "application/json" };

async function request(path: string, init?: RequestInit): Promise<any> {
  let res: Response;
  try {
    res = await authFetch(path, init);
  } catch {
    throw new ApiError("Can’t reach the server. Check that your API is running.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body?.message ?? `Request failed (HTTP ${res.status}).`, res.status, body?.field);
  }
  return body;
}

/** Accepts [..] or { data: [..] } */
function toRows(body: unknown): Row[] {
  if (Array.isArray(body)) return body;
  const data = (body as { data?: unknown } | null)?.data;
  if (Array.isArray(data)) return data;
  throw new ApiError("The server didn’t return a list of rows.");
}

export const listRows = async (resource: string): Promise<Row[]> => toRows(await request(`/${resource}`));

export const createRow = async (resource: string, data: Row): Promise<Row> =>
  (await request(`/${resource}`, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(data) })).data;

export const updateRow = async (resource: string, id: unknown, data: Row): Promise<Row> =>
  (await request(`/${resource}/${encodeURIComponent(String(id))}`, {
    method: "PUT", headers: JSON_HEADERS, body: JSON.stringify(data),
  })).data;

export const deleteRow = async (resource: string, id: unknown): Promise<void> => {
  await request(`/${resource}/${encodeURIComponent(String(id))}`, { method: "DELETE" });
};