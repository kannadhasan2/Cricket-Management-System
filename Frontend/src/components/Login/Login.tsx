import {useState } from "react";
import type{FormEvent} from "react";
import type{ LoginResponse } from "../Auth/Auth";
import { saveSession } from "../Auth/Auth";

const API: string =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:5001/api";

interface LoginProps {
  /** Called when the person clicks "Request access" */
  onGoToRegister?: () => void;
}

export default function Login({ onGoToRegister }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError("Enter both your username and password to take guard.");
      return;
    }

    setLoading(true);
    try {
      // Change this endpoint / body to match your backend
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password, remember }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message ?? "Wrong username or password.");
      if (typeof body?.token !== "string" || !body?.user) {
        throw new Error("Unexpected response from the server.");
      }
      // Saves the JWT to localStorage ("token"). <PublicOnlyRoute> then notices
      // and redirects to the page the person was trying to open.
      saveSession(body as LoginResponse);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Can’t reach the server. Check that your API is running."
          : (err as Error).message
      );
    } finally {
      setLoading(false);
    }
  };

  const input =
    "w-full rounded-lg border border-[#d5dcd3] bg-white px-4 py-3 text-[15px] text-[#12201a] " +
    "placeholder:text-[#8a998f] outline-none transition " +
    "focus:border-[#14352a] focus:ring-2 focus:ring-[#d9c38a]";

  return (
    <div className="grid min-h-screen bg-[#f4f6f2] font-['IBM_Plex_Sans',system-ui,sans-serif] lg:grid-cols-2">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');`}</style>

      {/* ───────── Left: the ground ───────── */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#14352a] p-12 text-white lg:flex
        bg-[repeating-linear-gradient(90deg,#14352a_0_56px,#173d30_56px_112px)]">
        <div className="flex items-center gap-3">
          <Ball className="h-9 w-9" />
          <span className="font-['Barlow_Condensed'] text-3xl font-bold tracking-wide">Scorebook</span>
        </div>

        <div>
          <p className="mb-3 font-['Barlow_Condensed'] text-lg font-semibold tracking-[0.2em] text-[#d9c38a]">
            LEAGUE MANAGEMENT
          </p>
          <h1 className="font-['Barlow_Condensed'] text-6xl font-bold leading-[0.95] xl:text-7xl">
            Every ball.<br />Every run.<br />Every record.
          </h1>
          <p className="mt-6 max-w-md text-[#c4d3c9]">
            Manage teams, auctions, matches and ball-by-ball scoring from one place.
          </p>

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-3">
            {[
              ["16", "Tables"],
              ["20", "Overs"],
              ["6", "Balls"],
            ].map(([n, l]) => (
              <div key={l} className="rounded-lg border border-[#2b6150] bg-[#0c241c]/80 px-4 py-3 text-center">
                <dt className="font-['Barlow_Condensed'] text-4xl font-bold leading-none text-[#d9c38a]">{n}</dt>
                <dd className="mt-1 text-xs text-[#a9bdb1]">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="text-sm text-[#8fa699]">© {new Date().getFullYear()} Scorebook League</p>

        <Ball className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 opacity-20" />
        <div className="absolute inset-y-0 right-0 w-1 bg-[#a4161a]" aria-hidden />
      </aside>

      {/* ───────── Right: the crease ───────── */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Ball className="h-9 w-9" />
            <span className="font-['Barlow_Condensed'] text-3xl font-bold text-[#14352a]">Scorebook</span>
          </div>

          <h2 className="font-['Barlow_Condensed'] text-5xl font-bold leading-none text-[#14352a]">Take guard</h2>
          <p className="mt-2 text-[#5d6e64]">Sign in to open the scorebook.</p>
          <div className="mt-5 h-1 w-16 rounded bg-[#a4161a]" />

          <form onSubmit={submit} noValidate className="mt-8 space-y-5">
            {error && (
              <div role="alert" className="rounded-lg border border-[#e6b8ba] bg-[#fbeeee] px-4 py-3 text-sm text-[#7a1013]">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="mb-1.5 block font-['Barlow_Condensed'] text-base font-semibold tracking-wider text-[#14352a]">
                USERNAME
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. captain07"
                className={input}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="font-['Barlow_Condensed'] text-base font-semibold tracking-wider text-[#14352a]">
                  PASSWORD
                </label>
                <a href="#forgot" className="text-sm font-medium text-[#a4161a] hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className={`${input} pr-16`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-pressed={showPw}
                  className="absolute inset-y-0 right-0 px-4 text-sm font-medium text-[#14352a] hover:text-[#a4161a] focus-visible:outline-2 focus-visible:outline-[#d9c38a]"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#12201a]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-[#d5dcd3] accent-[#14352a]"
              />
              Keep me signed in
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-b-4 border-[#a4161a] bg-[#14352a] px-4 py-3.5
                font-['Barlow_Condensed'] text-xl font-semibold tracking-widest text-white transition
                hover:bg-[#1d4a3a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d9c38a]
                disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
              )}
              {loading ? "SIGNING IN…" : "SIGN IN"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[#5d6e64]">
            New to the league?{" "}
            <button type="button" onClick={onGoToRegister} className="font-semibold text-[#14352a] hover:text-[#a4161a] hover:underline">
              Request access
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

/** Cricket ball with stitched seam */
function Ball({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`relative inline-block shrink-0 rounded-full shadow-lg ${className}`}
      style={{ background: "radial-gradient(circle at 35% 30%, #d03a3e, #a4161a 60%, #6e0c10)" }}
    >
      <span className="absolute inset-y-[6%] left-1/2 -translate-x-[4px] rotate-[8deg] border-l-2 border-dashed border-white/75" />
      <span className="absolute inset-y-[6%] left-1/2 translate-x-[3px] rotate-[8deg] border-l-2 border-dashed border-white/75" />
    </span>
  );
}