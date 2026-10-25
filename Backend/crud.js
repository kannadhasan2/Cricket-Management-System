class HttpError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

const q = (name) => `"${String(name).replace(/"/g, '""')}"`;

module.exports = function registerCrud(app, { pool, tables, requireAdmin }) {

  const columnCache = new Map();
  async function allowedColumns(table) {
    if (!columnCache.has(table)) {
      const { rows } = await pool.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1`,
        [table]
      );
      if (rows.length === 0) throw new Error(`Table public.${table} was not found`);
      columnCache.set(table, new Set(rows.map((r) => r.column_name)));
    }
    return columnCache.get(table);
  }

  async function pickFields(config, body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new HttpError(400, "Request body must be a JSON object.");
    }
    const allowed = await allowedColumns(config.table);
    const data = {};
    for (const [key, raw] of Object.entries(body)) {
      if (!allowed.has(key)) continue;
      if (raw !== null && typeof raw === "object") {
        throw new HttpError(400, `Invalid value for ${key}.`, key);
      }
      data[key] = typeof raw === "string" ? (raw.trim() === "" ? null : raw.trim()) : raw;
    }
    return data;
  }

  function parseId(value) {
    const id = Number(value);
    if (!Number.isInteger(id)) throw new HttpError(400, "The record id must be a whole number.");
    return id;
  }

  // Turn PostgreSQL errors into readable JSON messages
  function sendError(res, error, { deleting = false } = {}) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ success: false, message: error.message, field: error.field });
    }

    const detail = error.detail || "";
    const keyColumns = (/Key \(([^)]+)\)=/.exec(detail)?.[1] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const field = keyColumns.length === 1 ? keyColumns[0] : undefined;

    switch (error.code) {
      case "23505": // unique_violation
        return res.status(409).json({
          success: false,
          field,
          message: field
            ? "That value is already in use. It must be unique."
            : "That combination of values already exists.",
        });

      case "23503": { // foreign_key_violation
        if (deleting || /still referenced/i.test(detail)) {
          const usedBy = /from table "([^"]+)"/.exec(detail)?.[1];
          return res.status(409).json({
            success: false,
            message: `This record is used by ${usedBy ? `"${usedBy}"` : "other"} records, so it can’t be deleted. Remove or change those first.`,
          });
        }
        return res.status(400).json({ success: false, field, message: "The selected related record doesn’t exist." });
      }

      case "23502": // not_null_violation
        return res.status(400).json({
          success: false,
          field: error.column,
          message: `${String(error.column || "A required field").replace(/_/g, " ")} is required.`,
        });

      case "23514": // check_violation
        return res.status(400).json({ success: false, message: "A value breaks a rule for this table (for example a negative number or two identical teams)." });

      case "22P02": case "22007": case "22008": case "22003": case "22001":
        return res.status(400).json({ success: false, message: "A value has the wrong format, is too long, or is out of range." });

      default:
        console.error("Database error:", error.message);
        return res.status(500).json({ success: false, message: "Something went wrong on the server." });
    }
  }


  for (const [endpoint, config] of Object.entries(tables)) {
    const base = `/api/${endpoint}`;
    const table = `public.${q(config.table)}`;
    const pk = q(config.primaryKey);

    // GET one
    app.get(`${base}/:id`, async (req, res) => {
      try {
        const id = parseId(req.params.id);
        const { rows } = await pool.query(`SELECT * FROM ${table} WHERE ${pk} = $1`, [id]);
        if (!rows[0]) throw new HttpError(404, "Record not found.");
        res.json({ success: true, data: rows[0] });
      } catch (error) {
        sendError(res, error);
      }
    });

    // CREATE
    app.post(base, requireAdmin, async (req, res) => {
      try {
        const data = await pickFields(config, req.body);
        const cols = Object.keys(data);
        if (cols.length === 0) throw new HttpError(400, "No valid fields were supplied.");

        const { rows } = await pool.query(
          `INSERT INTO ${table} (${cols.map(q).join(", ")})
           VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")})
           RETURNING *`,
          cols.map((c) => data[c])
        );
        res.status(201).json({ success: true, data: rows[0] });
      } catch (error) {
        sendError(res, error);
      }
    });

    // UPDATE
    app.put(`${base}/:id`, requireAdmin, async (req, res) => {
      try {
        const id = parseId(req.params.id);
        const data = await pickFields(config, req.body);
        delete data[config.primaryKey]; // the primary key never changes
        const cols = Object.keys(data);
        if (cols.length === 0) throw new HttpError(400, "No valid fields were supplied.");

        const { rows } = await pool.query(
          `UPDATE ${table}
           SET ${cols.map((c, i) => `${q(c)} = $${i + 1}`).join(", ")}
           WHERE ${pk} = $${cols.length + 1}
           RETURNING *`,
          [...cols.map((c) => data[c]), id]
        );
        if (!rows[0]) throw new HttpError(404, "Record not found.");
        res.json({ success: true, data: rows[0] });
      } catch (error) {
        sendError(res, error);
      }
    });

    // DELETE
    app.delete(`${base}/:id`, requireAdmin, async (req, res) => {
      try {
        const id = parseId(req.params.id);
        const { rowCount } = await pool.query(`DELETE FROM ${table} WHERE ${pk} = $1`, [id]);
        if (!rowCount) throw new HttpError(404, "Record not found.");
        res.json({ success: true, message: "Record deleted." });
      } catch (error) {
        sendError(res, error, { deleting: true });
      }
    });
  }
};