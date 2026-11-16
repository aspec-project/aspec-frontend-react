import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function ProtectedRoute({ allowedRoles, allowedStatuses }) {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const generation = useAuthStore((state) => state.sessionGeneration);
  const location = useLocation();

  if (status === "loading" || status === "logging-out") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f8fa] px-4">
        <p role="status" className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
          A confirmar a sessão…
        </p>
      </main>
    );
  }

  if (!user || status !== 'authenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role?.name)) {
    return <Navigate to="/" replace />;
  }

  if (allowedStatuses && !allowedStatuses.includes(user.account_status?.name)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet key={`${user.id}:${generation}`} />;
}
