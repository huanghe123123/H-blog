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
