import { useState } from "react";
import { useNavigate } from "react-router-dom";
const TEAMS = [
    { code: "RCB", name: "Royal Challengers Bengaluru", color: "#D1171B", ink: "#fff" },
  { code: "CSK", name: "Chennai Super Kings", color: "#F9CD05", ink: "#1a1a1a" },
  { code: "MI", name: "Mumbai Indians", color: "#004BA0", ink: "#fff" },
  { code: "KKR", name: "Kolkata Knight Riders", color: "#3A225D", ink: "#F2C75C" },
  { code: "DC", name: "Delhi Capitals", color: "#17479E", ink: "#fff" },
  { code: "SRH", name: "Sunrisers Hyderabad", color: "#F26522", ink: "#fff" },
  { code: "RR", name: "Rajasthan Royals", color: "#EA1A85", ink: "#fff" },
  { code: "PBKS", name: "Punjab Kings", color: "#DD1F2D", ink: "#fff" },
  { code: "GT", name: "Gujarat Titans", color: "#1B2133", ink: "#C9A44C" },
  { code: "LSG", name: "Lucknow Super Giants", color: "#00A8E0", ink: "#fff" },
];
type TeamCode = /*unresolved*/ any
const team = (c:any) => TEAMS.find((t) => t.code === c);

const TABLE: [TeamCode, number, number, number, number, string][] = [
  ["GT", 12, 9, 3, 18, "+0.812"],
  ["RCB", 12, 8, 4, 16, "+0.545"],
  ["MI", 12, 7, 5, 14, "+0.391"],
  ["CSK", 12, 7, 5, 14, "+0.208"],
  ["KKR", 12, 6, 6, 12, "+0.044"],
  ["SRH", 12, 5, 7, 10, "-0.127"],
];

const FIXTURES: { a: TeamCode; b: TeamCode; when: string; time: string; venue: string }[] = [
  { a: "KKR", b: "DC", when: "Sat, 4 Oct", time: "3:30 PM", venue: "Eden Gardens, Kolkata" },
  { a: "RR", b: "LSG", when: "Sat, 4 Oct", time: "7:30 PM", venue: "Sawai Mansingh, Jaipur" },
  { a: "PBKS", b: "SRH", when: "Sun, 5 Oct", time: "7:30 PM", venue: "Mullanpur, Chandigarh" },
];

const MODULES = [
  { icon: "🏏", title: "Squad management", text: "Build playing XIs, track injuries and manage overseas slots for every team." },
  { icon: "📅", title: "Fixtures and venues", text: "Schedule matches, assign grounds and umpires, and handle reschedules." },
  { icon: "💰", title: "Auction and purse", text: "Run bidding rounds, monitor purse balances and retention rules." },
  { icon: "📊", title: "Player analytics", text: "Strike rates, economy, form curves and head-to-head records in one view." },
  { icon: "🎟️", title: "Ticketing", text: "Stadium capacity, stand pricing and live sales for each match day." },
  { icon: "📺", title: "Live scoring", text: "Ball-by-ball entry with instant updates to points table and stats." },
];

const CAPS: { tag: string; name: string; team: TeamCode; stat: string; unit: string }[] = [
  { tag: "Orange Cap", name: "Sai Sudharsan", team: "GT", stat: "612", unit: "runs" },
  { tag: "Purple Cap", name: "Prasidh Krishna", team: "GT", stat: "21", unit: "wickets" },
  { tag: "Best strike rate", name: "Vaibhav Suryavanshi", team: "RR", stat: "206.4", unit: "SR" },
];

const NAV: string[] = ["Home", "Matches", "Teams", "Players", "Auction", "Stats"];

interface BadgeProps {
  code: TeamCode;
  size?: string;
}

const Badge = ({ code, size = "h-12 w-12 text-sm" }: BadgeProps) => {
  const t = team(code);
  return (
    <span
      className={`${size} inline-flex shrink-0 items-center justify-center rounded-full font-extrabold ring-2 ring-white/30`}
      style={{ background: t?.color, color: t?.ink }}
      title={t?.name}
    >
      {code}
    </span>
  );
};



interface SectionTitleProps {
  title: string;
  sub?: string;
  action?: string;
}

const SectionTitle = ({ title, sub, action }: SectionTitleProps) => (
  <div className="mb-8 flex items-end justify-between gap-4">
    <div>
      <h2 className="font-display text-3xl font-bold tracking-wide text-[#0B1B4D] sm:text-4xl">{title}</h2>
      {sub && <p className="mt-1 max-w-xl text-slate-600">{sub}</p>}
    </div>
    {action && (
      <a href="#" className="hidden shrink-0 rounded-full border border-[#0B1B4D]/20 px-4 py-2 text-sm font-semibold text-[#0B1B4D] hover:bg-[#0B1B4D] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF6A00] sm:inline-block">
        {action}
      </a>
    )}
  </div>
);

export default function Home() {
  const [open, setOpen] = useState<boolean>(false);
  const navigate = useNavigate()
  const signOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login", { replace: true });
  };

  return (
    <div className="font-body min-h-screen bg-[#F6F3EE] text-slate-800 antialiased">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600;700&display=swap');
        .font-display{font-family:'Barlow Condensed',system-ui,sans-serif}
        .font-body{font-family:'Barlow',system-ui,sans-serif}
        @keyframes pulseDot{0%,100%{opacity:1}50%{opacity:.25}}
        .live-dot{animation:pulseDot 1.4s ease-in-out infinite}
        @media (prefers-reduced-motion:reduce){.live-dot{animation:none}}
      `}</style>

      <header className="sticky top-0 z-40 bg-[#0B1B4D]/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <a href="#" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#FF9A1F] to-[#FF4E00] font-display text-lg font-extrabold shadow-lg">
              IPL
            </span>
            <span className="font-display text-xl font-bold leading-none tracking-wide">
              League Manager
            </span>
          </a>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {NAV.map((n, i) => (
              <a key={n} href="/tables" className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF9A1F] ${i === 0 ? "bg-white/10 text-[#FFB347]" : "text-white/80"}`}>
                {n}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={signOut} className="hidden rounded-full bg-gradient-to-r from-[#FF9A1F] to-[#FF4E00] px-5 py-2 text-sm font-bold text-white shadow-lg shadow-orange-900/30 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:inline-block cursor-pointer">
              Sign Out
            </button>
            <button
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-label="Toggle menu"
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 lg:hidden"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-white/10 px-4 pb-4 lg:hidden" aria-label="Mobile">
            {NAV.map((n) => (
              <a key={n} href="/login" className="block rounded-lg px-3 py-3 font-semibold text-white/90 hover:bg-white/10">{n}</a>
            ))}
            <a href="#" className="mt-2 block rounded-full bg-gradient-to-r from-[#FF9A1F] to-[#FF4E00] px-4 py-3 text-center font-bold">Sign in</a>
          </nav>
        )}
      </header>

      <section className="relative overflow-hidden bg-[#0B1B4D] text-white">
        <div className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-[#FF6A00]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-[24rem] w-[24rem] rounded-full bg-[#2E5BFF]/30 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-24">
          <div>
            <h1 className="font-display text-5xl font-extrabold leading-[0.95] sm:text-6xl lg:text-7xl">
              Run the Indian Premier League from one dashboard.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-white/75">
              Manage squads, fixtures, auctions and live scoring for all ten franchises. Every update reaches the points table instantly.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#" className="rounded-full bg-gradient-to-r from-[#FF9A1F] to-[#FF4E00] px-7 py-3.5 text-center font-bold shadow-xl shadow-orange-900/40 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                Open dashboard
              </a>
              <a href="#fixtures" className="rounded-full border border-white/30 px-7 py-3.5 text-center font-bold hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                View fixtures
              </a>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-white/15 pt-6">
              {(
                [
                  ["10", "Franchises"],
                  ["74", "Matches"],
                  ["250+", "Players"],
                ] as const
              ).map(([v, l]) => (
                <div key={l}>
                  <dt className="text-sm text-white/60">{l}</dt>
                  <dd className="font-display text-3xl font-bold text-[#FFB347]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-3xl bg-white p-5 text-slate-800 shadow-2xl shadow-black/40 sm:p-7">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-600">
                <span className="live-dot h-2 w-2 rounded-full bg-red-600" /> Live
              </span>
              <span className="text-sm text-slate-500">Match 58 · Wankhede, Mumbai</span>
            </div>

            <div className="mt-6 space-y-5">
              {[
                { c: "MI", score: "186/5", overs: "20 overs" },
                { c: "CSK", score: "142/4", overs: "15.2 overs" },
              ].map((r) => (
                <div key={r.c} className="flex items-center gap-4">
                  <Badge code={r.c} size="h-14 w-14 text-base" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-[#0B1B4D]">{team(r.c)?.name}</p>
                    <p className="text-sm text-slate-500">{r.overs}</p>
                  </div>
                  <p className="font-display text-4xl font-extrabold text-[#0B1B4D]">{r.score}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-[#FFF4E5] px-4 py-3 text-sm font-semibold text-[#B34700]">
              CSK need 45 runs from 28 balls
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-slate-500">Batting</p>
                <p className="font-semibold">R. Gaikwad 68* (41)</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-slate-500">Bowling</p>
                <p className="font-semibold">J. Bumrah 2/24 (3.2)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/10 bg-black/20">
          <div className="mx-auto flex max-w-7xl gap-4 overflow-x-auto px-4 py-4 sm:px-6 lg:justify-between lg:px-8">
            {TEAMS.map((t) => <Badge key={t.code} code={t.code} size="h-11 w-11 text-xs" />)}
          </div>
        </div>
      </section>

      <section id="fixtures" className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-5 lg:px-8 lg:py-20">
        <div className="lg:col-span-2">
          <SectionTitle title="Upcoming matches" sub="The next three games on the calendar." />
          <div className="space-y-4">
            {FIXTURES.map((f) => (
              <article key={f.a + f.b} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Badge code={f.a} size="h-12 w-12 text-sm" />
                    <span className="font-display text-xl font-bold text-slate-400">vs</span>
                    <Badge code={f.b} size="h-12 w-12 text-sm" />
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#0B1B4D]">{f.time}</p>
                    <p className="text-sm text-slate-500">{f.when}</p>
                  </div>
                </div>
                <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">{f.venue}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          <SectionTitle title="Points table" sub="Top six after 12 rounds. The top four qualify for the playoffs." action="Full table" />
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-[#0B1B4D] text-white">
                  <tr>
                    {["#", "Team", "P", "W", "L", "Pts", "NRR"].map((h, i) => (
                      <th key={h} className={`px-4 py-3 font-semibold ${i > 1 ? "text-center" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TABLE.map((r, i) => (
                    <tr key={r[0]} className={`border-t border-slate-100 ${i < 4 ? "bg-white" : "bg-slate-50/70"}`}>
                      <td className="px-4 py-3 font-bold text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-3 font-semibold text-[#0B1B4D]">
                          <Badge code={r[0]} size="h-8 w-8 text-[10px]" /> {team(r[0])?.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">{r[1]}</td>
                      <td className="px-4 py-3 text-center">{r[2]}</td>
                      <td className="px-4 py-3 text-center">{r[3]}</td>
                      <td className="px-4 py-3 text-center font-extrabold text-[#FF4E00]">{r[4]}</td>
                      <td className={`px-4 py-3 text-center font-medium ${r[5].startsWith("-") ? "text-red-600" : "text-emerald-600"}`}>{r[5]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-[#FF9A1F] to-[#FF4E00] py-16 text-white lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Leading the season</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {CAPS.map((c) => (
              <div key={c.tag} className="rounded-2xl bg-[#0B1B4D] p-6 shadow-xl">
                <p className="text-sm font-semibold text-[#FFB347]">{c.tag}</p>
                <p className="mt-3 font-display text-5xl font-extrabold">
                  {c.stat} <span className="text-lg font-semibold text-white/60">{c.unit}</span>
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <Badge code={c.team} size="h-9 w-9 text-[10px]" />
                  <p className="font-semibold">{c.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <SectionTitle title="Everything you need to manage the league" sub="Six modules, one login, built for league officials and franchise staff." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <a key={m.title} href="#" className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-lg hover:ring-[#FF6A00]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF6A00]">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF4E5] text-2xl">{m.icon}</span>
              <h3 className="mt-4 font-display text-2xl font-bold text-[#0B1B4D]">{m.title}</h3>
              <p className="mt-2 text-slate-600">{m.text}</p>
              <span className="mt-4 inline-block text-sm font-bold text-[#FF4E00] group-hover:underline">Open module</span>
            </a>
          ))}
        </div>
      </section>

      <section className="bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionTitle title="The ten franchises" sub="Select a team to see its squad, fixtures and finances." />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {TEAMS.map((t) => (
              <a key={t.code} href="#" className="group overflow-hidden rounded-2xl ring-1 ring-slate-200 transition hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF6A00]">
                <div className="flex h-24 items-center justify-center font-display text-4xl font-extrabold" style={{ background: t.color, color: t.ink }}>
                  {t.code}
                </div>
                <p className="px-3 py-3 text-center text-sm font-semibold text-[#0B1B4D] group-hover:text-[#FF4E00]">{t.name}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-[#0B1B4D] p-8 text-white sm:p-12 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Ready for match day?</h2>
            <p className="mt-2 max-w-md text-white/70">Sign in to start scoring, set your XI or review the auction board.</p>
          </div>
          <a href="#" className="rounded-full bg-gradient-to-r from-[#FF9A1F] to-[#FF4E00] px-8 py-3.5 font-bold shadow-xl hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
            Sign in to dashboard
          </a>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>© 2026 IPL League Manager. Demo data for illustration only.</p>
          <div className="flex flex-wrap gap-5 font-medium">
            {["About", "Rules", "Support", "Privacy"].map((l) => (
              <a key={l} href="#" className="hover:text-[#FF4E00]">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}