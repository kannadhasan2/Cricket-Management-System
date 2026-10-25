export type Row = Record<string, any>;
export type FieldType = "int" | "decimal" | "text" | "date";

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  min?: number;
  max?: number;
  maxLength?: number;
  /** Path of the table this field points to. The stored value is that table's primary key. */
  fk?: string;
  /** Suggestions for free-text fields (shown as a drop-down list, but any text is allowed) */
  options?: string[];
  default?: string;
  money?: boolean;
  help?: string;
}

export interface ResourceDef {
  /** API path, e.g. "teams" -> /api/teams */
  path: string;
  label: string;
  singular: string;
  group: string;
  pk: string;
  fields: Field[];
  /** Extra rules that compare several fields. Return { fieldName: "message" } */
  validate?: (values: Record<string, string>) => Record<string, string>;
}

/* ───────────── Small field builders ───────────── */

const id = (name: string, label = "ID"): Field => ({ name, label, type: "int", required: true, min: 1 });
const ref = (name: string, label: string, resource: string, required = false): Field =>
  ({ name, label, type: "int", fk: resource, required });
const text = (name: string, label: string, o: Partial<Field> = {}): Field =>
  ({ name, label, type: "text", maxLength: 100, ...o });
const int = (name: string, label: string, o: Partial<Field> = {}): Field => ({ name, label, type: "int", ...o });
const date = (name: string, label: string, o: Partial<Field> = {}): Field => ({ name, label, type: "date", ...o });

/* ───────────── Every table ───────────── */

export const RESOURCE_LIST: ResourceDef[] = [
  // People
  { path: "persons", label: "People", singular: "Person", group: "People", pk: "person_id",
    fields: [id("person_id"), text("name", "Full name", { required: true }), date("dob", "Date of birth")] },

  { path: "players", label: "Players", singular: "Player", group: "People", pk: "person_id",
    fields: [
      ref("person_id", "Person", "persons", true),
      text("role", "Role", { required: true, maxLength: 50, options: ["Batsman", "Bowler", "All-rounder", "Wicketkeeper"] }),
      text("batting_style", "Batting style", { maxLength: 50, options: ["Right-hand bat", "Left-hand bat"] }),
      text("bowling_style", "Bowling style", { maxLength: 50, options: ["Right-arm fast", "Left-arm fast", "Right-arm medium", "Right-arm off break", "Left-arm orthodox", "Leg break"] }),
    ] },

  { path: "coaches", label: "Coaches", singular: "Coach", group: "People", pk: "person_id",
    fields: [
      ref("person_id", "Person", "persons", true),
      text("role", "Role", { required: true, maxLength: 50, options: ["Head coach", "Batting coach", "Bowling coach", "Fielding coach"] }),
      ref("team_id", "Team", "teams"),
    ] },

  { path: "umpires", label: "Umpires", singular: "Umpire", group: "People", pk: "person_id",
    fields: [
      ref("person_id", "Person", "persons", true),
      int("experience_years", "Experience (years)", { required: true, min: 0, max: 80 }),
      text("specialization", "Specialization"),
    ] },

  // Franchise
  { path: "owners", label: "Owners", singular: "Owner", group: "Franchise", pk: "owner_id",
    fields: [id("owner_id"), text("company_name", "Company name", { required: true })] },

  { path: "teams", label: "Teams", singular: "Team", group: "Franchise", pk: "team_id",
    fields: [id("team_id"), ref("owner_id", "Owner", "owners", true), text("name", "Team name", { required: true }), text("city", "City", { required: true })] },

  { path: "sponsors", label: "Sponsors", singular: "Sponsor", group: "Franchise", pk: "sponsor_id",
    fields: [id("sponsor_id"), text("brand_name", "Brand name", { required: true })] },

  { path: "team-sponsors", label: "Team sponsors", singular: "Team sponsor", group: "Franchise", pk: "team_sponsor_id",
    fields: [id("team_sponsor_id"), ref("team_id", "Team", "teams", true), ref("sponsor_id", "Sponsor", "sponsors", true), ref("season_id", "Season", "seasons", true)] },

  // Tournament
  { path: "seasons", label: "Seasons", singular: "Season", group: "Tournament", pk: "season_id",
    fields: [id("season_id"), int("year", "Year", { required: true, min: 1900, max: 2200 }), ref("sponsor_id", "Title sponsor", "sponsors"), ref("winner_team_id", "Champions", "teams")] },

  { path: "venues", label: "Venues", singular: "Venue", group: "Tournament", pk: "venue_id",
    fields: [id("venue_id"), text("name", "Stadium name", { required: true }), int("capacity", "Capacity", { required: true, min: 1 })] },

  { path: "auction-records", label: "Auction", singular: "Auction record", group: "Tournament", pk: "auction_id",
    fields: [
      id("auction_id"), ref("player_id", "Player", "players", true), ref("team_id", "Bought by", "teams", true),
      ref("season_id", "Season", "seasons", true),
      { name: "sold_price", label: "Sold price (₹)", type: "decimal", required: true, min: 0, money: true },
    ] },

  // Match centre
  { path: "matches", label: "Matches", singular: "Match", group: "Match centre", pk: "match_id",
    fields: [
      id("match_id", "Match no."), ref("season_id", "Season", "seasons", true), ref("venue_id", "Venue", "venues", true),
      date("match_date", "Match date", { required: true }),
      ref("team1_id", "Team 1", "teams", true), ref("team2_id", "Team 2", "teams", true),
      ref("toss_winner_id", "Toss won by", "teams"), ref("winner_team_id", "Winner", "teams"),
    ],
    validate: (v) => {
      const e: Record<string, string> = {};
      if (v.team1_id && v.team1_id === v.team2_id) e.team2_id = "Team 2 must be different from Team 1.";
      for (const f of ["toss_winner_id", "winner_team_id"]) {
        if (v[f] && v[f] !== v.team1_id && v[f] !== v.team2_id) e[f] = "Must be one of the two teams playing.";
      }
      return e;
    } },

  { path: "match-umpires", label: "Match umpires", singular: "Match umpire", group: "Match centre", pk: "match_umpire_id",
    fields: [
      id("match_umpire_id"), ref("match_id", "Match", "matches", true), ref("person_id", "Umpire", "umpires", true),
      text("role", "Role", { maxLength: 50, options: ["On-field umpire", "Third umpire", "Match referee"] }),
    ] },

  { path: "innings", label: "Innings", singular: "Innings", group: "Match centre", pk: "innings_id",
    fields: [
      id("innings_id"), ref("match_id", "Match", "matches", true), int("innings_number", "Innings no.", { required: true, min: 1, max: 4 }),
      ref("batting_team_id", "Batting team", "teams", true),
      int("total_runs", "Total runs", { min: 0, default: "0" }), int("total_wickets", "Total wickets", { min: 0, max: 10, default: "0" }),
    ] },

  { path: "ball-by-ball", label: "Ball by ball", singular: "Ball", group: "Match centre", pk: "ball_id",
    fields: [
      id("ball_id"), ref("innings_id", "Innings", "innings", true),
      int("over_number", "Over", { required: true, min: 0 }), int("ball_number", "Ball", { required: true, min: 0 }),
      ref("batter_id", "Batter", "players", true), ref("bowler_id", "Bowler", "players", true),
      int("runs_scored", "Runs scored", { min: 0, default: "0" }),
      text("dismissals_type", "Dismissal", { maxLength: 50, options: ["bowled", "caught", "lbw", "run out", "stumped", "hit wicket"] }),
      text("extra_type", "Extra", { maxLength: 50, options: ["wide", "no ball", "bye", "leg bye"] }),
    ] },

  { path: "performances", label: "Performances", singular: "Performance", group: "Match centre", pk: "performance_id",
    fields: [
      id("performance_id"), ref("match_id", "Match", "matches", true), ref("player_id", "Player", "players", true),
      int("runs", "Runs", { min: 0, default: "0" }), int("wickets", "Wickets", { min: 0, default: "0" }),
    ] },
];

export const RESOURCES: Record<string, ResourceDef> = Object.fromEntries(RESOURCE_LIST.map((r) => [r.path, r]));
export const GROUPS = Array.from(new Set(RESOURCE_LIST.map((r) => r.group)));

/* ───────────── Labels shown instead of raw ids ───────────── */

export type Lookup = (resource: string, id: unknown) => Row | undefined;

export const formatDate = (v: unknown): string => {
  const [y, m, d] = String(v).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return String(v);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/** A readable name for one record, e.g. a team's name or "#12 · Chennai vs Mumbai". */
export function rowLabel(resource: string, row: Row, get: Lookup): string {
  const rid = row[RESOURCES[resource].pk];
  switch (resource) {
    case "persons": case "venues": case "teams": return String(row.name ?? `#${rid}`);
    case "owners": return String(row.company_name ?? `#${rid}`);
    case "sponsors": return String(row.brand_name ?? `#${rid}`);
    case "seasons": return String(row.year ?? `#${rid}`);
    case "players": case "coaches": case "umpires":
      return String(get("persons", row.person_id)?.name ?? `Person #${row.person_id}`);
    case "matches": {
      const a = get("teams", row.team1_id)?.name ?? `#${row.team1_id}`;
      const b = get("teams", row.team2_id)?.name ?? `#${row.team2_id}`;
      return `#${rid} · ${a} vs ${b}${row.match_date ? ` · ${formatDate(row.match_date)}` : ""}`;
    }
    case "innings": return `Match #${row.match_id} · Innings ${row.innings_number}`;
    default: return `#${rid}`;
  }
}

/** Tables whose rows are needed to show readable labels for another table's foreign keys. */
const LABEL_DEPS: Record<string, string[]> = {
  players: ["persons"], coaches: ["persons"], umpires: ["persons"], matches: ["teams"],
};

/** Which tables to load when a table is open: itself, every table it points to, and what their labels need. */
export function neededResources(path: string): string[] {
  const set = new Set([path]);
  for (const f of RESOURCES[path].fields) {
    if (!f.fk) continue;
    set.add(f.fk);
    (LABEL_DEPS[f.fk] ?? []).forEach((d) => set.add(d));
  }
  return [...set];
}