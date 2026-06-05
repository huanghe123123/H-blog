import { Navigate, Outlet } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "../hooks/useAuth";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spin fullscreen />;
  }
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

export function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spin fullscreen />;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin" && user.role !== "owner") return <Navigate to="/" replace />;
  return <Outlet />;
}
