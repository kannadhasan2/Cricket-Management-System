import { useEffect, useMemo, useState } from "react";
import Footer from "../Footer/Footer";
import AppHeader from "../AppHeader/AppHeader";

type Cell = string | number | null;
type Row = Record<string, Cell>;
type Kind = "num" | "date" | "money" | "badge" | "wicket";

type TableKey =
  | "Person" | "Owner" | "Sponsor" | "Venue" | "Team" | "Player" | "Coach"
  | "Umpire" | "Season" | "Cricket_Match" | "Match_Umpire" | "Team_Sponsor"
  | "Auction_Record" | "Innings" | "Ball_by_Ball" | "Performance";

interface Column {
  key: string;
  label: string;
  kind?: Kind;
  /** Show a readable value from another table instead of the raw id */
  fk?: { table: TableKey; show: string };
}

interface TableDef {
  label: string;
  group: string;
  pk: string;
  endpoint: string; // GET {API}/{endpoint} -> Row[]
  columns: Column[];
}

const API: string = "http://localhost:5001/api";

const team = (key: string, label: string): Column => ({
  key, label, fk: { table: "Team", show: "name" },
});
const person = (key: string, label: string): Column => ({
  key, label, fk: { table: "Person", show: "name" },
});

const TABLES: Record<TableKey, TableDef> = {
  Person: { label: "People", group: "People", pk: "person_id", endpoint: "persons",
    columns: [{ key: "person_id", label: "ID", kind: "num" }, { key: "name", label: "Name" }, { key: "dob", label: "Date of birth", kind: "date" }] },
  Player: { label: "Players", group: "People", pk: "person_id", endpoint: "players",
    columns: [person("person_id", "Player"), { key: "role", label: "Role", kind: "badge" }, { key: "batting_style", label: "Batting" }, { key: "bowling_style", label: "Bowling" }] },
  Coach: { label: "Coaches", group: "People", pk: "person_id", endpoint: "coaches",
    columns: [person("person_id", "Coach"), { key: "role", label: "Role", kind: "badge" }, team("team_id", "Team")] },
  Umpire: { label: "Umpires", group: "People", pk: "person_id", endpoint: "umpires",
    columns: [person("person_id", "Umpire"), { key: "experience_years", label: "Experience (yrs)", kind: "num" }, { key: "specialization", label: "Specialization" }] },

  Owner: { label: "Owners", group: "Franchise", pk: "owner_id", endpoint: "owners",
    columns: [{ key: "owner_id", label: "ID", kind: "num" }, { key: "company_name", label: "Company" }] },
  Team: { label: "Teams", group: "Franchise", pk: "team_id", endpoint: "teams",
    columns: [{ key: "team_id", label: "ID", kind: "num" }, { key: "name", label: "Team" }, { key: "city", label: "City" }, { key: "owner_id", label: "Owner", fk: { table: "Owner", show: "company_name" } }] },
  Sponsor: { label: "Sponsors", group: "Franchise", pk: "sponsor_id", endpoint: "sponsors",
    columns: [{ key: "sponsor_id", label: "ID", kind: "num" }, { key: "brand_name", label: "Brand" }] },
  Team_Sponsor: { label: "Team sponsors", group: "Franchise", pk: "team_sponsor_id", endpoint: "team-sponsors",
    columns: [{ key: "team_sponsor_id", label: "ID", kind: "num" }, team("team_id", "Team"), { key: "sponsor_id", label: "Sponsor", fk: { table: "Sponsor", show: "brand_name" } }, { key: "season_id", label: "Season", fk: { table: "Season", show: "year" } }] },

  Season: { label: "Seasons", group: "Tournament", pk: "season_id", endpoint: "seasons",
    columns: [{ key: "season_id", label: "ID", kind: "num" }, { key: "year", label: "Year", kind: "num" }, { key: "sponsor_id", label: "Title sponsor", fk: { table: "Sponsor", show: "brand_name" } }, team("winner_team_id", "Champions")] },
  Venue: { label: "Venues", group: "Tournament", pk: "venue_id", endpoint: "venues",
    columns: [{ key: "venue_id", label: "ID", kind: "num" }, { key: "name", label: "Stadium" }, { key: "capacity", label: "Capacity", kind: "num" }] },
  Auction_Record: { label: "Auction", group: "Tournament", pk: "auction_id", endpoint: "auction-records",
    columns: [{ key: "auction_id", label: "ID", kind: "num" }, person("player_id", "Player"), team("team_id", "Bought by"), { key: "season_id", label: "Season", fk: { table: "Season", show: "year" } }, { key: "sold_price", label: "Sold price", kind: "money" }] },

  Cricket_Match: { label: "Matches", group: "Match centre", pk: "match_id", endpoint: "matches",
    columns: [{ key: "match_id", label: "Match", kind: "num" }, { key: "match_date", label: "Date", kind: "date" }, { key: "season_id", label: "Season", fk: { table: "Season", show: "year" } }, { key: "venue_id", label: "Venue", fk: { table: "Venue", show: "name" } }, team("team1_id", "Team 1"), team("team2_id", "Team 2"), team("toss_winner_id", "Toss won by"), team("winner_team_id", "Winner")] },
  Match_Umpire: { label: "Match umpires", group: "Match centre", pk: "match_umpire_id", endpoint: "match-umpires",
    columns: [{ key: "match_umpire_id", label: "ID", kind: "num" }, { key: "match_id", label: "Match", kind: "num" }, person("person_id", "Umpire"), { key: "role", label: "Role", kind: "badge" }] },
  Innings: { label: "Innings", group: "Match centre", pk: "innings_id", endpoint: "innings",
    columns: [{ key: "innings_id", label: "ID", kind: "num" }, { key: "match_id", label: "Match", kind: "num" }, { key: "innings_number", label: "Innings", kind: "num" }, team("batting_team_id", "Batting"), { key: "total_runs", label: "Runs", kind: "num" }, { key: "total_wickets", label: "Wkts", kind: "num" }] },
  Ball_by_Ball: { label: "Ball by ball", group: "Match centre", pk: "ball_id", endpoint: "ball-by-ball",
    columns: [{ key: "ball_id", label: "ID", kind: "num" }, { key: "innings_id", label: "Innings", kind: "num" }, { key: "over_number", label: "Over", kind: "num" }, { key: "ball_number", label: "Ball", kind: "num" }, person("batter_id", "Batter"), person("bowler_id", "Bowler"), { key: "runs_scored", label: "Runs", kind: "num" }, { key: "dismissals_type", label: "Dismissal", kind: "wicket" }, { key: "extra_type", label: "Extra", kind: "badge" }] },
  Performance: { label: "Performances", group: "Match centre", pk: "performance_id", endpoint: "performances",
    columns: [{ key: "performance_id", label: "ID", kind: "num" }, { key: "match_id", label: "Match", kind: "num" }, person("player_id", "Player"), { key: "runs", label: "Runs", kind: "num" }, { key: "wickets", label: "Wickets", kind: "num" }] },
};

const KEYS = Object.keys(TABLES) as TableKey[];
const GROUPS = Array.from(new Set(KEYS.map((k) => TABLES[k].group)));
const PAGE_SIZE = 15;

type Data = Partial<Record<TableKey, Row[]>>;

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-IN");

function useCricketData() {
  const [data, setData] = useState<Data>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  
useEffect(() => {
  let cancelled = false;

  Promise.all(
    KEYS.map(async (k) => {
      const res = await fetch(`${API}/${TABLES[k].endpoint}`);

      if (!res.ok) {
        throw new Error(
          `${TABLES[k].label}: HTTP ${res.status}`
        );
      }

      const result = await res.json();

      // 1. Direct array: [...]
      const rows = Array.isArray(result)
        ? result
        : result.data;

      if (!Array.isArray(rows)) {
        throw new Error(
          `${TABLES[k].label}: API response is not an array`
        );
      }

      return [k, rows] as const;
    })
  )
    .then((pairs) => {
      if (!cancelled) {
        setData(Object.fromEntries(pairs));
      }
    })
    .catch((e: Error) => {
      if (!cancelled) setError(e.message);
    })
    .finally(() => {
      if (!cancelled) setLoading(false);
    });

  return () => {
    cancelled = true;
  };
}, []);


  return { data, loading, error };
}


export default function CricketDashboard() {
  const { data, loading, error } = useCricketData();
  const [active, setActive] = useState<TableKey>("Cricket_Match");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);

  const def = TABLES[active];

  // id -> row lookups used to turn foreign keys into names
  const lookups = useMemo(() => {
    const out: Partial<Record<TableKey, Map<Cell, Row>>> = {};
    KEYS.forEach((k) => out[k] = new Map((data[k] ?? []).map((r) => [r[TABLES[k].pk], r])));
    return out;
  }, [data]);

  const display = (col: Column, row: Row): string => {
    const v = row[col.key];
    if (v === null || v === undefined || v === "") return "";
    if (col.fk) return String(lookups[col.fk.table]?.get(v)?.[col.fk.show] ?? v);
    if (col.kind === "money") return inr.format(Number(v));
    if (col.kind === "date") return new Date(String(v)).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    if (col.kind === "num") return num.format(Number(v));
    return String(v);
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = data[active] ?? [];
    if (q) list = list.filter((r) => def.columns.some((c) => display(c, r).toLowerCase().includes(q)));
    if (sort) {
      list = [...list].sort((a, b) => {
        const x = a[sort.key], y = b[sort.key];
        if (x === y) return 0;
        if (x === null) return 1;
        if (y === null) return -1;
        return (x > y ? 1 : -1) * sort.dir;
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, active, query, sort, lookups]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visible = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const choose = (k: TableKey) => { setActive(k); setQuery(""); setSort(null); setPage(0); };
  const toggleSort = (key: string) =>
    setSort((s) => (s?.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null));

  const renderCell = (c: Column, r: Row) => {
    const text = display(c, r);
    if (!text) return <span className="dash">–</span>;
    if (c.fk) return <span className="fk" title={`${c.fk.table} #${r[c.key]}`}>{text}</span>;
    if (c.kind === "badge") return <span className="badge">{text}</span>;
    if (c.kind === "wicket") return <span className="badge wicket">{text}</span>;
    if (c.kind === "money") return <strong className="money">{text}</strong>;
    return text;
  };

  return (
    <>
    <AppHeader />
    <div className="cd">
      <style>{CSS}</style>

      

      <aside className="cd-side">
        <a href="/home" className="cd-brand">
          <span className="ball" aria-hidden />
          <div><h1>Scorebook</h1><p>League database</p></div>
        </a>
        <nav aria-label="Tables">
          {GROUPS.map((g) => (
            <div key={g} className="grp">
              <h2>{g}</h2>
              {KEYS.filter((k) => TABLES[k].group === g).map((k) => (
                <button key={k} className={k === active ? "on" : ""} onClick={() => choose(k)} aria-current={k === active}>
                  <span>{TABLES[k].label}</span>
                  <em>{data[k]?.length ?? "–"}</em>
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="cd-main">
        <header className="board">
          <div>
            <h2>{def.label}</h2>
            <p>{def.group} · table <code>{active}</code></p>
          </div>
          <div className="tally" aria-label="Row count">
            <b>{num.format(rows.length)}</b>
            <span>{rows.length === 1 ? "record" : "records"}</span>
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder={`Search ${def.label.toLowerCase()}`}
            aria-label={`Search ${def.label}`}
          />
        </header>

        {error && <div className="note err">Couldn’t load data: {error}. Check that the API at {API} is running.</div>}
        {loading && <div className="note">Loading the scorebook…</div>}

        {!loading && !error && (
          <>
            <div className="sheet">
              <table>
                <thead>
                  <tr>
                    {def.columns.map((c) => (
                      <th key={c.key} className={c.kind === "num" || c.kind === "money" ? "r" : ""}
                          aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                        <button onClick={() => toggleSort(c.key)}>
                          {c.label}
                          <i>{sort?.key === c.key ? (sort.dir === 1 ? "▲" : "▼") : ""}</i>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={String(r[def.pk])}>
                      {def.columns.map((c) => (
                        <td key={c.key} className={c.kind === "num" || c.kind === "money" ? "r" : ""}>{renderCell(c, r)}</td>
                      ))}
                    </tr>
                  ))}
                  {visible.length === 0 && (
                    <tr><td colSpan={def.columns.length} className="empty">No records match “{query}”. Clear the search to see all {def.label.toLowerCase()}.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <footer className="pager">
              <span>Showing {rows.length ? page * PAGE_SIZE + 1 : 0}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} of {num.format(rows.length)}</span>
              <div>
                <button disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
                <span className="pg">Page {page + 1} of {pages}</span>
                <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            </footer>
          </>
        )}
      </main>
    </div>
    <Footer />
    </>
  );
}

/* ───────────── Styles ───────────── */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

.cd{--grass:#14352a;--grass-2:#1d4a3a;--grass-3:#2b6150;--whites:#f4f6f2;--ink:#12201a;--muted:#5d6e64;
  --line:#d5dcd3;--ball:#a4161a;--straw:#d9c38a;
  display:grid;grid-template-columns:260px 1fr;min-height:100vh;background:var(--whites);color:var(--ink);
  font-family:'IBM Plex Sans',system-ui,sans-serif;font-size:15px}
.cd *{box-sizing:border-box}
.cd button{font:inherit;cursor:pointer}
.cd :focus-visible{outline:2px solid var(--straw);outline-offset:2px}

/* sidebar */
.cd-side{background:var(--grass);color:#e8efe9;padding:24px 14px;position:sticky;top:0;height:100vh;overflow:auto}
.cd-brand{display:flex;gap:12px;align-items:center;padding:0 10px 22px;border-bottom:1px solid var(--grass-3)}
.cd-brand h1{margin:0;font:700 28px/1 'Barlow Condensed',sans-serif;letter-spacing:.02em}
.cd-brand p{margin:3px 0 0;color:#a9bdb1;font-size:13px}
.ball{width:34px;height:34px;border-radius:50%;flex:none;background:radial-gradient(circle at 35% 30%,#d03a3e,var(--ball) 60%,#6e0c10);
  position:relative;box-shadow:0 2px 6px rgba(0,0,0,.35)}
.ball::before,.ball::after{content:"";position:absolute;left:50%;top:6%;bottom:6%;width:0;border-left:2px dashed rgba(255,255,255,.75)}
.ball::before{transform:translateX(-4px) rotate(8deg)}.ball::after{transform:translateX(3px) rotate(8deg)}
.grp{margin-top:20px}
.grp h2{margin:0 10px 6px;font:600 15px 'Barlow Condensed',sans-serif;color:var(--straw);letter-spacing:.06em}
.grp button{display:flex;width:100%;justify-content:space-between;align-items:center;background:none;border:0;color:inherit;
  padding:8px 10px;border-radius:6px;border-left:3px solid transparent;text-align:left}
.grp button:hover{background:var(--grass-2)}
.grp button.on{background:var(--grass-2);border-left-color:var(--ball);font-weight:600}
.grp button em{font-style:normal;font-size:12px;background:var(--grass-3);padding:1px 8px;border-radius:10px;font-variant-numeric:tabular-nums}

/* main */
.cd-main{padding:28px clamp(16px,3vw,40px);min-width:0}
.board{display:grid;grid-template-columns:1fr auto minmax(200px,300px);gap:20px;align-items:center;background:var(--grass);color:#fff;
  padding:18px 24px;border-radius:10px 10px 0 0;border-bottom:4px solid var(--ball)}
.board h2{margin:0;font:700 40px/1 'Barlow Condensed',sans-serif;letter-spacing:.01em}
.board p{margin:6px 0 0;color:#a9bdb1;font-size:13px}
.board code{background:var(--grass-2);padding:1px 6px;border-radius:4px;color:var(--straw)}
.tally{text-align:center;background:#0c241c;border:1px solid var(--grass-3);border-radius:8px;padding:6px 18px}
.tally b{display:block;font:700 34px/1 'Barlow Condensed',sans-serif;color:var(--straw);font-variant-numeric:tabular-nums}
.tally span{font-size:12px;color:#a9bdb1}
.board input{width:100%;padding:10px 14px;border-radius:8px;border:1px solid var(--grass-3);background:var(--grass-2);color:#fff;font:inherit}
.board input::placeholder{color:#9db3a6}

.sheet{overflow-x:auto;background:#fff;border:1px solid var(--line);border-top:0}
table{width:100%;border-collapse:collapse;min-width:640px}
thead th{position:sticky;top:0;background:#e9eee7;border-bottom:2px solid var(--grass);text-align:left;padding:0;white-space:nowrap}
thead th.r,td.r{text-align:right;font-variant-numeric:tabular-nums}
thead button{width:100%;display:flex;gap:6px;justify-content:space-between;align-items:center;background:none;border:0;
  padding:12px 16px;font:600 16px 'Barlow Condensed',sans-serif;letter-spacing:.04em;color:var(--grass)}
thead th.r button{flex-direction:row-reverse;justify-content:flex-start}
thead button:hover{background:#dde5da}
thead i{font-style:normal;font-size:10px;color:var(--ball);min-width:10px}
tbody td{padding:11px 16px;border-bottom:1px solid var(--line)}
tbody tr:nth-child(even){background:#f7f9f6}
tbody tr:hover{background:#eef3e9}
.dash{color:#aab6ae}
.fk{border-bottom:1px  var(--grass-3);cursor:help}
.badge{display:inline-block;padding:2px 10px;border-radius:12px;background:#e3ecdf;color:var(--grass);font-size:13px;font-weight:500}
.badge.wicket{background:var(--ball);color:#fff}
.money{color:var(--grass)}
.empty{text-align:center;color:var(--muted);padding:40px 16px}

.pager{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;padding:14px 4px;color:var(--muted);font-size:14px}
.pager div{display:flex;align-items:center;gap:10px}
.pager button{background:var(--grass);color:#fff;border:0;border-radius:6px;padding:7px 16px;font-weight:500}
.pager button:disabled{background:#c5cfc7;cursor:not-allowed}
.pager .pg{color:var(--ink);font-variant-numeric:tabular-nums}
.note{padding:24px;background:#fff;border:1px solid var(--line);border-top:0}
.note.err{color:#7a1013;background:#fbeeee}

@media (max-width:860px){
  .cd{grid-template-columns:1fr}
  .cd-side{position:static;height:auto}
  .board{grid-template-columns:1fr auto}
  .board input{grid-column:1/-1}
}
@media (prefers-reduced-motion:no-preference){.grp button,tbody tr{transition:background .15s}}
`;