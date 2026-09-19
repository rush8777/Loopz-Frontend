import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function ProtectedRoute() {
  const { user, bootstrapping } = useAuth();

  if (bootstrapping) {
    return <div style={{ height: "100vh", background: "var(--bg)" }} />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
