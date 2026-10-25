import { Link, NavLink } from "react-router-dom";
import { logout, useAuth } from "../Auth/Auth";

/** Top bar shared by the Stats and Manage pages. The "Manage data" link is only shown to admins. */
export default function AppHeader() {
  const { user, isAdmin } = useAuth();

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition ${
      isActive ? "bg-[#1d4a3a] text-white" : "text-[#c4d3c9] hover:text-white"
    }`;

  return (
    <header className="sticky top-0 z-20 border-b-4 border-[#a4161a] bg-[#14352a] text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <span aria-hidden className="h-7 w-7 rounded-full shadow"
            style={{ background: "radial-gradient(circle at 35% 30%, #d03a3e, #a4161a 60%, #6e0c10)" }} />
          <span className="font-['Barlow_Condensed'] text-2xl font-bold tracking-wide">Scorebook</span>
        </Link>

        <nav className="flex flex-wrap gap-1" aria-label="Main">
          <NavLink to="/tables" end className={navCls}>Data tables</NavLink>
          <NavLink to="/stats" className={navCls}>Stats</NavLink>
          {isAdmin && <NavLink to="/manage" className={navCls}>Manage data</NavLink>}
        </nav>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-[#c4d3c9]">
            {user?.username} <em className="not-italic text-[#a9bdb1]">({user?.role})</em>
          </span>
          <button onClick={logout}
            className="rounded-md border border-[#2b6150] px-3 py-1.5 hover:border-[#d9c38a] hover:bg-[#1d4a3a]">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}