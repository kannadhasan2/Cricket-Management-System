import { ReactNode } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { logout, useAuth } from "../Auth/Auth";

interface ProtectedRouteProps {
  /** Only these roles may enter, e.g. roles={["admin"]}. Leave out to allow any signed-in user. */
  roles?: string[];
  /** Where to send people who aren't signed in */
  redirectTo?: string;
  /** Use as a wrapper: <ProtectedRoute><Page /></ProtectedRoute>. Without children it renders nested routes. */
  children?: ReactNode;
}

/** Blocks a page unless the person is signed in (and has the right role, if roles is set). */
export function ProtectedRoute({ roles, redirectTo = "/login", children }: ProtectedRouteProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Remember where they were going so login can send them back there
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }
  if (roles && !roles.includes(user.role)) return <Forbidden />;

  return <>{children ?? <Outlet />}</>;
}

/** Keeps signed-in people away from /login and /register. After login it returns them to the page they wanted. */
export function PublicOnlyRoute({ children }: { children?: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string; search?: string } } | null)?.from;

  if (user) return <Navigate to={from ? `${from.pathname}${from.search ?? ""}` : "/"} replace />;
  return <>{children ?? <Outlet />}</>;
}

function Forbidden() {
  const { user } = useAuth();
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6f2] px-6 font-['IBM_Plex_Sans',system-ui,sans-serif]">
      <div className="max-w-md text-center">
        <p className="font-['Barlow_Condensed'] text-lg font-semibold tracking-[0.2em] text-[#a4161a]">ACCESS DENIED</p>
        <h1 className="mt-2 font-['Barlow_Condensed'] text-6xl font-bold leading-none text-[#14352a]">You’re out!</h1>
        <p className="mt-4 text-[#5d6e64]">
          {user?.username}, your account doesn’t have permission to open this page.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/" className="rounded-lg border-b-4 border-[#a4161a] bg-[#14352a] px-6 py-2.5 font-['Barlow_Condensed'] text-lg font-semibold tracking-widest text-white hover:bg-[#1d4a3a]">
            BACK TO SCOREBOOK
          </Link>
          <button onClick={logout} className="rounded-lg border border-[#d5dcd3] bg-white px-6 py-2.5 font-medium text-[#14352a] hover:border-[#14352a]">
            Switch account
          </button>
        </div>
      </div>
    </main>
  );
}

export default ProtectedRoute;