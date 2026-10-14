import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function ProtectedRoute({ allowedRoles, allowedStatuses }) {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const generation = useAuthStore((state) => state.sessionGeneration);
  const location = useLocation();

  if (status === "loading" || status === "logging-out") {
    return null;
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
