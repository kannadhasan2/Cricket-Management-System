import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { authFetch } from "../Auth/Auth";
import AppHeader from "../AppHeader/AppHeader";

/* ───────────── Data shapes (only the columns used here) ───────────── */

interface Person { person_id: number; name: string }
interface Player { person_id: number; role: string }
interface Team { team_id: number; name: string }
interface Season { season_id: number; year: number }
interface Venue { venue_id: number; name: string }
interface Match {
  match_id: number; season_id: number; venue_id: number; team1_id: number; team2_id: number;
  toss_winner_id: number | null; winner_team_id: number | null;
}
interface Innings { match_id: number; innings_number: number; batting_team_id: number; total_runs: number | null; total_wickets: number | null }
interface Ball { innings_id: number; over_number: number; runs_scored: number | null; dismissals_type: string | null }
interface Perf { player_id: number; runs: number | null; wickets: number | null }
interface Auction { player_id: number; team_id: number; sold_price: string | number }

interface Raw {
  persons: Person[]; players: Player[]; umpires: unknown[]; teams: Team[]; sponsors: unknown[];
  seasons: Season[]; venues: Venue[]; matches: Match[]; innings: Innings[]; balls: Ball[];
  performances: Perf[]; auctions: Auction[];
}

/** Edit these paths if your backend routes are named differently. */
const SOURCES: Record<keyof Raw, string> = {
  persons: "/persons", players: "/players", umpires: "/umpires", teams: "/teams", sponsors: "/sponsors",
  seasons: "/seasons", venues: "/venues", matches: "/matches", innings: "/innings",
  balls: "/ball-by-ball", performances: "/performances", auctions: "/auction-records",
};

const EMPTY: Raw = {
  persons: [], players: [], umpires: [], teams: [], sponsors: [], seasons: [], venues: [],
  matches: [], innings: [], balls: [], performances: [], auctions: [],
};

/** Accepts [..], {data:[..]}, {rows:[..]}, {results:[..]} or an object with a single array. */
function toRows(payload: unknown): any[] | null {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    for (const k of ["data", "rows", "results", "items"]) if (Array.isArray(obj[k])) return obj[k] as any[];
    const arrays = Object.values(obj).filter(Array.isArray);
    if (arrays.length === 1) return arrays[0] as any[];
  }
  return null;
}

function useRaw() {
  const [raw, setRaw] = useState<Raw>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const failures: string[] = [];
    const entries = await Promise.all(
      (Object.keys(SOURCES) as (keyof Raw)[]).map(async (k) => {
        try {
          const res = await authFetch(SOURCES[k]);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const rows = toRows(await res.json());
          if (!rows) throw new Error("not a list of rows");
          return [k, rows] as const;
        } catch (e) {
          failures.push(`${k} (${(e as Error).message})`);
          return [k, []] as const;
        }
      })
    );
    setRaw({ ...EMPTY, ...Object.fromEntries(entries) } as unknown as Raw);
    setFailed(failures);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { raw, loading, failed, reload: load };
}

/* ───────────── Statistics (all computed in the browser from the tables) ───────────── */

const num = new Intl.NumberFormat("en-IN");
const sum = (xs: (number | null | undefined)[]) => xs.reduce<number>((a, b) => a + (b ?? 0), 0);
const clip = (s: string, n = 16) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const pretty = (s: string) => s.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function inrShort(v: number): string {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return `₹${num.format(v)}`;
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null);

function computeStats(r: Raw) {
  const teamName = new Map(r.teams.map((t) => [t.team_id, t.name]));
  const personName = new Map(r.persons.map((p) => [p.person_id, p.name]));
  const seasonYear = new Map(r.seasons.map((s) => [s.season_id, s.year]));
  const venueName = new Map(r.venues.map((v) => [v.venue_id, v.name]));
  const matchSeason = new Map(r.matches.map((m) => [m.match_id, m.season_id]));
  const T = (id: number) => teamName.get(id) ?? `Team ${id}`;
  const P = (id: number) => personName.get(id) ?? `Player ${id}`;

  const top = (m: Map<number, number>, n = 8) =>
    [...m].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, n)
      .map(([id, value]) => ({ name: P(id), value }));
  const toList = (m: Map<string, number>) => [...m].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Points table
  const table = new Map<number, { team: string; played: number; won: number; lost: number; nr: number }>();
  const entry = (id: number) => {
    let x = table.get(id);
    if (!x) { x = { team: T(id), played: 0, won: 0, lost: 0, nr: 0 }; table.set(id, x); }
    return x;
  };
  for (const m of r.matches) {
    for (const id of [m.team1_id, m.team2_id]) {
      const x = entry(id);
      x.played++;
      if (m.winner_team_id == null) x.nr++;
      else if (m.winner_team_id === id) x.won++;
      else x.lost++;
    }
  }
  const standings = [...table.values()]
    .map((x) => ({ ...x, points: x.won * 2 + x.nr, winPct: pct(x.won, x.played) ?? 0 }))
    .sort((a, b) => b.points - a.points || b.winPct - a.winPct);

  // Runs by season
  const bySeason = new Map<number, { runs: number; innings: number; matches: Set<number> }>();
  for (const i of r.innings) {
    const sid = matchSeason.get(i.match_id);
    if (sid == null) continue;
    const s = bySeason.get(sid) ?? { runs: 0, innings: 0, matches: new Set<number>() };
    s.runs += i.total_runs ?? 0; s.innings++; s.matches.add(i.match_id);
    bySeason.set(sid, s);
  }
  const seasonTrend = [...bySeason]
    .map(([sid, v]) => ({
      year: seasonYear.get(sid) ?? sid, runs: v.runs, matches: v.matches.size,
      avg: v.innings ? Math.round(v.runs / v.innings) : 0,
    }))
    .sort((a, b) => a.year - b.year);

  // Top performers
  const runsBy = new Map<number, number>();
  const wktsBy = new Map<number, number>();
  for (const p of r.performances) {
    runsBy.set(p.player_id, (runsBy.get(p.player_id) ?? 0) + (p.runs ?? 0));
    wktsBy.set(p.player_id, (wktsBy.get(p.player_id) ?? 0) + (p.wickets ?? 0));
  }

  // Auction
  const sales = r.auctions.map((a) => ({ ...a, price: Number(a.sold_price) || 0 }));
  const spendByTeam = new Map<string, number>();
  for (const s of sales) spendByTeam.set(T(s.team_id), (spendByTeam.get(T(s.team_id)) ?? 0) + s.price);
  const topBuys = [...sales].sort((a, b) => b.price - a.price).slice(0, 8)
    .map((s) => ({ name: P(s.player_id), team: T(s.team_id), value: s.price }));

  // Match insights
  const decided = r.matches.filter((m) => m.winner_team_id != null);
  const tossKnown = decided.filter((m) => m.toss_winner_id != null);
  const tossWins = tossKnown.filter((m) => m.toss_winner_id === m.winner_team_id).length;
  const firstBat = new Map<number, number>();
  for (const i of r.innings) if (i.innings_number === 1) firstBat.set(i.match_id, i.batting_team_id);
  const batKnown = decided.filter((m) => firstBat.has(m.match_id));
  const batFirstWins = batKnown.filter((m) => firstBat.get(m.match_id) === m.winner_team_id).length;

  // Squad roles + venues
  const roles = new Map<string, number>();
  for (const p of r.players) roles.set(p.role || "Unknown", (roles.get(p.role || "Unknown") ?? 0) + 1);
  const venues = new Map<string, number>();
  for (const m of r.matches) venues.set(venueName.get(m.venue_id) ?? `Venue ${m.venue_id}`, (venues.get(venueName.get(m.venue_id) ?? `Venue ${m.venue_id}`) ?? 0) + 1);

  // Ball by ball
  const overAgg = new Map<number, { runs: number; inn: Set<number> }>();
  const outcomes = new Map<string, number>();
  const dismissals = new Map<string, number>();
  let fours = 0, sixes = 0;
  for (const b of r.balls) {
    const runs = b.runs_scored ?? 0;
    const o = overAgg.get(b.over_number) ?? { runs: 0, inn: new Set<number>() };
    o.runs += runs; o.inn.add(b.innings_id);
    overAgg.set(b.over_number, o);
    const key = runs === 0 ? "Dot" : runs > 6 ? "7+" : String(runs);
    outcomes.set(key, (outcomes.get(key) ?? 0) + 1);
    if (runs === 4) fours++;
    if (runs === 6) sixes++;
    if (b.dismissals_type) dismissals.set(pretty(b.dismissals_type), (dismissals.get(pretty(b.dismissals_type)) ?? 0) + 1);
  }
  const overTrend = [...overAgg].sort((a, b) => a[0] - b[0])
    .map(([over, v]) => ({ over, avg: Math.round((v.runs / v.inn.size) * 100) / 100 }));
  const outcomeOrder = ["Dot", "1", "2", "3", "4", "5", "6", "7+"];
  const ballOutcomes = outcomeOrder.filter((k) => outcomes.has(k)).map((k) => ({ name: k, value: outcomes.get(k)! }));

  return {
    kpis: {
      teams: r.teams.length, players: r.players.length, matches: r.matches.length,
      runs: sum(r.innings.map((i) => i.total_runs)), wickets: sum(r.innings.map((i) => i.total_wickets)),
      fours, sixes, spend: sum(sales.map((s) => s.price)),
    },
    standings, seasonTrend, overTrend, ballOutcomes,
    topRuns: top(runsBy), topWickets: top(wktsBy), topBuys,
    spendByTeam: toList(spendByTeam).slice(0, 8),
    roles: toList(roles), dismissals: toList(dismissals).slice(0, 8),
    venues: toList(venues).slice(0, 8),
    tossPct: pct(tossWins, tossKnown.length), tossN: tossKnown.length,
    batFirstPct: pct(batFirstWins, batKnown.length), batN: batKnown.length,
  };
}

/* ───────────── Small UI pieces ───────────── */

const AXIS = { fill: "#5d6e64", fontSize: 12 };
const PALETTE = ["#14352a", "#a4161a", "#c9a94f", "#2b6150", "#c77d1a", "#5f9a4c", "#6e0c10", "#8a998f"];

function Panel({ title, sub, className = "", empty, children }: {
  title: string; sub?: string; className?: string; empty?: boolean; children: ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-[#d5dcd3] bg-white p-5 shadow-sm ${className}`}>
      <h3 className="font-['Barlow_Condensed'] text-2xl font-bold leading-none text-[#14352a]">{title}</h3>
      {sub && <p className="mt-1 text-sm text-[#5d6e64]">{sub}</p>}
      <div className="mt-4">
        {empty ? <p className="py-12 text-center text-sm text-[#8a998f]">No data yet.</p> : children}
      </div>
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#d5dcd3] border-l-4 border-l-[#a4161a] bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-[#5d6e64]">{label}</p>
      <p className="mt-1 font-['Barlow_Condensed'] text-4xl font-bold leading-none text-[#14352a]">{value}</p>
    </div>
  );
}

function Tip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#d5dcd3] bg-white px-3 py-2 text-sm shadow">
      <div className="font-semibold text-[#14352a]">{p.name ?? label}</div>
      {p.team && <div className="text-[#5d6e64]">{p.team}</div>}
      <div className="font-medium text-[#12201a]">{fmt(p.value)}</div>
    </div>
  );
}

function HBars({ data, color, fmt = (v: number) => num.format(v) }: {
  data: { name: string; value: number; team?: string }[]; color: string; fmt?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#e3e8e1" horizontal={false} />
        <XAxis type="number" tick={AXIS} tickFormatter={fmt} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={112} tick={AXIS} tickFormatter={(v: string) => clip(v)} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: "#f0f4ee" }} content={<Tip fmt={fmt} />} />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Donut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2} stroke="none">
          {data.map((d, i) => <Cell key={d.name} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip />
        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 13 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function Ring({ value, label, note }: { value: number | null; label: string; note: string }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center text-center">
      <svg viewBox="0 0 140 140" className="h-36 w-36" role="img" aria-label={`${label}: ${value ?? "no data"}%`}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e3e8e1" strokeWidth="14" />
        <circle cx="70" cy="70" r={r} fill="none" stroke="#a4161a" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${(c * (value ?? 0)) / 100} ${c}`} transform="rotate(-90 70 70)" />
        <text x="70" y="80" textAnchor="middle" fontSize="34" fontWeight="700" fill="#14352a"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          {value === null ? "–" : `${value}%`}
        </text>
      </svg>
      <p className="mt-1 font-semibold text-[#14352a]">{label}</p>
      <p className="text-xs text-[#5d6e64]">{note}</p>
    </div>
  );
}

/* ───────────── Page ───────────── */

export default function Stats() {
  const { raw, loading, failed, reload } = useRaw();
  const s = useMemo(() => computeStats(raw), [raw]);

  return (
    <div className="min-h-screen bg-[#f4f6f2] font-['IBM_Plex_Sans',system-ui,sans-serif] text-[#12201a]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');`}</style>

      <AppHeader />

      <main className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-['Barlow_Condensed'] text-base font-semibold tracking-[0.2em] text-[#a4161a]">LEAGUE OVERVIEW</p>
            <h1 className="font-['Barlow_Condensed'] text-5xl font-bold leading-none text-[#14352a]">Season stats</h1>
          </div>
          <button onClick={reload} disabled={loading}
            className="rounded-lg border-b-4 border-[#a4161a] bg-[#14352a] px-5 py-2 font-['Barlow_Condensed'] text-lg font-semibold tracking-widest text-white hover:bg-[#1d4a3a] disabled:opacity-60">
            {loading ? "REFRESHING…" : "REFRESH"}
          </button>
        </div>

        {failed.length > 0 && (
          <div role="alert" className="mb-6 rounded-lg border border-[#e6b8ba] bg-[#fbeeee] px-4 py-3 text-sm text-[#7a1013]">
            Couldn’t load: {failed.join(", ")}. Check the paths in <code>SOURCES</code> at the top of Stats.tsx.
          </div>
        )}

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-[#e3e8e1]" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Kpi label="Teams" value={num.format(s.kpis.teams)} />
              <Kpi label="Players" value={num.format(s.kpis.players)} />
              <Kpi label="Matches" value={num.format(s.kpis.matches)} />
              <Kpi label="Total runs" value={num.format(s.kpis.runs)} />
              <Kpi label="Wickets" value={num.format(s.kpis.wickets)} />
              <Kpi label="Fours" value={num.format(s.kpis.fours)} />
              <Kpi label="Sixes" value={num.format(s.kpis.sixes)} />
              <Kpi label="Auction spend" value={inrShort(s.kpis.spend)} />
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              <Panel className="lg:col-span-2" title="Points table" sub="2 points for a win, 1 for no result" empty={!s.standings.length}>
                <div className="max-h-80 overflow-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead className="sticky top-0 bg-[#e9eee7] text-left font-['Barlow_Condensed'] text-base tracking-wider text-[#14352a]">
                      <tr>
                        <th className="px-3 py-2">#</th><th className="px-3 py-2">TEAM</th>
                        {["P", "W", "L", "NR"].map((h) => <th key={h} className="px-3 py-2 text-right">{h}</th>)}
                        <th className="px-3 py-2">WIN %</th><th className="px-3 py-2 text-right">PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.standings.map((t, i) => (
                        <tr key={t.team} className="border-b border-[#e3e8e1] even:bg-[#f7f9f6]">
                          <td className="px-3 py-2 tabular-nums text-[#5d6e64]">{i + 1}</td>
                          <td className="px-3 py-2 font-semibold">{t.team}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{t.played}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{t.won}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{t.lost}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{t.nr}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#e3e8e1]">
                                <div className="h-full rounded-full bg-[#14352a]" style={{ width: `${t.winPct}%` }} />
                              </div>
                              <span className="w-9 tabular-nums text-[#5d6e64]">{t.winPct}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-bold tabular-nums text-[#a4161a]">{t.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <Panel title="Match insights" sub="Does the toss or batting first decide matches?" empty={s.tossN + s.batN === 0}>
                <div className="grid grid-cols-2 gap-2">
                  <Ring value={s.tossPct} label="Toss winner wins" note={`${s.tossN} matches`} />
                  <Ring value={s.batFirstPct} label="Bat first wins" note={`${s.batN} matches`} />
                </div>
              </Panel>

              <Panel className="lg:col-span-2" title="Runs by season" sub="Total runs scored and average per innings" empty={!s.seasonTrend.length}>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={s.seasonTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#e3e8e1" vertical={false} />
                    <XAxis dataKey="year" tick={AXIS} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="l" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => num.format(v)} />
                    <YAxis yAxisId="r" orientation="right" tick={AXIS} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
                    <Area yAxisId="l" type="monotone" dataKey="runs" name="Total runs" stroke="#14352a" strokeWidth={2} fill="#14352a" fillOpacity={0.14} />
                    <Line yAxisId="r" type="monotone" dataKey="avg" name="Avg runs / innings" stroke="#a4161a" strokeWidth={2.5} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="Squad roles" sub="Players by role" empty={!s.roles.length}>
                <Donut data={s.roles} />
              </Panel>

              <Panel className="lg:col-span-2" title="Top wicket takers" empty={!s.topWickets.length}>
                <HBars data={s.topWickets} color="#a4161a" />
              </Panel>
              <Panel title="Top run scorers" empty={!s.topRuns.length}>
                <HBars data={s.topRuns} color="#14352a" />
              </Panel>
              
              <Panel title="How batters get out" sub="Dismissal types from ball-by-ball data" empty={!s.dismissals.length}>
                <Donut data={s.dismissals} />
              </Panel>

              <Panel className="lg:col-span-1" title="Scoring rate by over" sub="Average runs scored in each over of an innings" empty={!s.overTrend.length}>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={s.overTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#e3e8e1" vertical={false} />
                    <XAxis dataKey="over" tick={AXIS} axisLine={false} tickLine={false} label={{ value: "Over", position: "insideBottomRight", offset: -2, fill: "#5d6e64", fontSize: 12 }} />
                    <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [`${v} runs`, "Average"]} labelFormatter={(l) => `Over ${l}`} />
                    <Line type="monotone" dataKey="avg" stroke="#a4161a" strokeWidth={2.5} dot={{ r: 3, fill: "#a4161a" }} />
                  </LineChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="Ball outcomes" sub="Runs off the bat per delivery" empty={!s.ballOutcomes.length}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={s.ballOutcomes} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#e3e8e1" vertical={false} />
                    <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => num.format(v)} />
                    <Tooltip cursor={{ fill: "#f0f4ee" }} formatter={(v) => [num.format(Number(v)), "Balls"]} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {s.ballOutcomes.map((d) => (
                        <Cell key={d.name} fill={d.name === "6" || d.name === "4" ? "#a4161a" : d.name === "Dot" ? "#8a998f" : "#14352a"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Panel>

              <Panel  title="Most expensive buys" sub="Highest auction prices" empty={!s.topBuys.length}>
                <HBars data={s.topBuys} color="#c9a94f" fmt={inrShort} />
              </Panel>
              <Panel title="Auction spend by team" empty={!s.spendByTeam.length}>
                <HBars data={s.spendByTeam} color="#2b6150" fmt={inrShort} />
              </Panel>
              <Panel title="Matches by venue" empty={!s.venues.length}>
                <HBars data={s.venues} color="#5f9a4c" />
              </Panel>
            </div>
          </>
        )}
      </main>
    </div>
  );
}