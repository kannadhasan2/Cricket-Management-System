import { FormEvent, ReactNode, useMemo, useState } from "react";

const API: string =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:5001/api";

interface RegisterProps {
  /** Called after the account is created and the person clicks "Go to sign in" */
  onRegistered?: () => void;
  /** Called when the person clicks "Sign in" in the footer */
  onGoToLogin?: () => void;
}

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,30}$/; // same rule as the backend

function checkPassword(pw: string) {
  const checks = [
    { label: "At least 8 characters", ok: pw.length >= 8 },
    { label: "Upper and lowercase letters", ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
    { label: "A number", ok: /\d/.test(pw) },
    { label: "A symbol (! @ # …)", ok: /[^A-Za-z0-9]/.test(pw) },
  ];
  let score = checks.filter((c) => c.ok).length;
  if (pw.length < 8) score = Math.min(score, 1);
  const meter = [
    { label: "Weak", color: "#a4161a" },
    { label: "Weak", color: "#a4161a" },
    { label: "Fair", color: "#c77d1a" },
    { label: "Good", color: "#5f9a4c" },
    { label: "Strong", color: "#14352a" },
  ][score];
  return { checks, score, ...meter };
}

export default function Register({ onRegistered, onGoToLogin }: RegisterProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [takenName, setTakenName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const strength = useMemo(() => checkPassword(password), [password]);

  const errors = {
    username: !username.trim()
      ? "Choose a username."
      : !USERNAME_RE.test(username.trim())
      ? "Use 3–30 letters, numbers, dots, dashes or underscores."
      : takenName === username.trim()
      ? "That username is already taken. Try another."
      : "",
    password: !password ? "Create a password." : password.length < 8 ? "Use at least 8 characters." : "",
    confirm: !confirm ? "Re-enter your password." : confirm !== password ? "Passwords don’t match." : "",
    agree: agree ? "" : "Please accept the league rules to continue.",
  };
  type Field = keyof typeof errors;
  const shown = (f: Field) => (touched[f] || submitted) && errors[f];
  const touch = (f: Field) => () => setTouched((t) => ({ ...t, [f]: true }));

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);

    const firstBad = (["username", "password", "confirm", "agree"] as Field[]).find((f) => errors[f]);
    if (firstBad) {
      document.getElementById(firstBad)?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.status === 409) {
        setTakenName(username.trim());
        document.getElementById("username")?.focus();
        return;
      }
      if (!res.ok) throw new Error(body?.message ?? "Could not create your account.");
      setDone(true);
    } catch (err) {
      setServerError(
        err instanceof TypeError
          ? "Can’t reach the server. Check that your API is running."
          : (err as Error).message
      );
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (invalid: boolean) =>
    "w-full rounded-lg border bg-white px-4 py-3 text-[15px] text-[#12201a] placeholder:text-[#8a998f] outline-none transition focus:ring-2 " +
    (invalid
      ? "border-[#a4161a] focus:border-[#a4161a] focus:ring-[#e6b8ba]"
      : "border-[#d5dcd3] focus:border-[#14352a] focus:ring-[#d9c38a]");

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
            JOIN THE LEAGUE
          </p>
          <h1 className="font-['Barlow_Condensed'] text-6xl font-bold leading-[0.95] xl:text-7xl">
            Pad up.<br />Your innings<br />starts here.
          </h1>
          <ul className="mt-8 max-w-md space-y-3 text-[#c4d3c9]">
            {[
              "Browse teams, players and fixtures",
              "Follow auctions and season records",
              "Dig into ball-by-ball match history",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#a4161a]" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
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

          {done ? (
            <div role="status" className="text-center">
              <Ball className="mx-auto h-16 w-16" />
              <h2 className="mt-6 font-['Barlow_Condensed'] text-5xl font-bold leading-none text-[#14352a]">
                You’re in the squad
              </h2>
              <p className="mt-3 mb-2 text-[#5d6e64]">
                Your account <strong className="text-[#12201a]">{username.trim()}</strong> is ready. Sign in to open the scorebook.
              </p>
              <a href="/login"
                className="mt-12 w-full rounded-lg border-b-4 border-[#a4161a] bg-[#14352a] px-4 py-3.5 font-['Barlow_Condensed'] text-xl font-semibold tracking-widest text-white transition hover:bg-[#1d4a3a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d9c38a]"
              >
                GO TO SIGN IN
              </a>
            </div>
          ) : (
            <>
              <h2 className="font-['Barlow_Condensed'] text-5xl font-bold leading-none text-[#14352a]">Create account</h2>
              <p className="mt-2 text-[#5d6e64]">Register to get access to the scorebook.</p>
              <div className="mt-5 h-1 w-16 rounded bg-[#a4161a]" />

              <form onSubmit={submit} noValidate className="mt-8 space-y-5">
                {serverError && (
                  <div role="alert" className="rounded-lg border border-[#e6b8ba] bg-[#fbeeee] px-4 py-3 text-sm text-[#7a1013]">
                    {serverError}
                  </div>
                )}

                {/* Username */}
                <Field id="username" label="USERNAME" error={shown("username")} hint="3–30 characters: letters, numbers, . - _">
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={touch("username")}
                    aria-invalid={!!shown("username")}
                    aria-describedby="username-msg"
                    placeholder="e.g. captain07"
                    className={inputCls(!!shown("username"))}
                  />
                </Field>

                {/* Password */}
                <Field id="password" label="PASSWORD" error={shown("password")}>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={touch("password")}
                      aria-invalid={!!shown("password")}
                      aria-describedby="password-msg"
                      placeholder="Create a password"
                      className={`${inputCls(!!shown("password"))} pr-16`}
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

                  {password && (
                    <div className="mt-3" aria-live="polite">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-1 gap-1.5" aria-hidden>
                          {[1, 2, 3, 4].map((i) => (
                            <span
                              key={i}
                              className="h-1.5 flex-1 rounded-full transition-colors"
                              style={{ background: i <= strength.score ? strength.color : "#e3e8e1" }}
                            />
                          ))}
                        </div>
                        <span className="w-14 text-right text-sm font-semibold" style={{ color: strength.color }}>
                          {strength.label}
                        </span>
                      </div>
                      <ul className="mt-3 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                        {strength.checks.map((c) => (
                          <li key={c.label} className={c.ok ? "text-[#14352a]" : "text-[#8a998f]"}>
                            <span aria-hidden className="mr-1.5 inline-block w-4 font-bold">{c.ok ? "✓" : "○"}</span>
                            {c.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Field>

                {/* Confirm */}
                <Field id="confirm" label="CONFIRM PASSWORD" error={shown("confirm")}>
                  <input
                    id="confirm"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onBlur={touch("confirm")}
                    aria-invalid={!!shown("confirm")}
                    aria-describedby="confirm-msg"
                    placeholder="Type it again"
                    className={inputCls(!!shown("confirm"))}
                  />
                  {confirm && confirm === password && !errors.confirm && (
                    <p className="mt-1.5 text-sm text-[#14352a]">✓ Passwords match</p>
                  )}
                </Field>

                {/* Rules */}
                <div>
                  <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[#12201a]">
                    <input
                      id="agree"
                      type="checkbox"
                      checked={agree}
                      onChange={(e) => { setAgree(e.target.checked); touch("agree")(); }}
                      aria-invalid={!!shown("agree")}
                      className="mt-0.5 h-4 w-4 rounded border-[#d5dcd3] accent-[#14352a]"
                    />
                    <span>
                      I agree to the{" "}
                      <a href="#rules" className="font-semibold text-[#14352a] underline hover:text-[#a4161a]">league rules</a>{" "}
                      and{" "}
                      <a href="#privacy" className="font-semibold text-[#14352a] underline hover:text-[#a4161a]">privacy policy</a>.
                    </span>
                  </label>
                  {shown("agree") && <p role="alert" className="mt-1.5 text-sm text-[#a4161a]">{errors.agree}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-b-4 border-[#a4161a] bg-[#14352a] px-4 py-3.5
                    font-['Barlow_Condensed'] text-xl font-semibold tracking-widest text-white transition
                    hover:bg-[#1d4a3a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d9c38a]
                    disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
                  {loading ? "CREATING ACCOUNT…" : "CREATE ACCOUNT"}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-[#5d6e64]">
                Already in the squad?{" "}
                <button onClick={onGoToLogin} className="font-semibold text-[#14352a] hover:text-[#a4161a] hover:underline">
                  Sign in
                </button>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/** Label + control + error/hint message wrapper */
function Field({
  id, label, error, hint, children,
}: { id: string; label: string; error?: string | false; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-['Barlow_Condensed'] text-base font-semibold tracking-wider text-[#14352a]">
        {label}
      </label>
      {children}
      <p id={`${id}-msg`} role={error ? "alert" : undefined} className={`mt-1.5 text-sm ${error ? "text-[#a4161a]" : "text-[#5d6e64]"}`}>
        {error || hint}
      </p>
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