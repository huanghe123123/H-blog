import { Navigate } from "react-router-dom";
import { createBrowserRouter } from "react-router-dom";
import { AdminRoute, ProtectedRoute } from "../components/ProtectedRoute";
import { AppLayout } from "../layouts/AppLayout";
import { AdminUsersPage } from "../pages/AdminUsersPage";
import { AboutPage } from "../pages/AboutPage";
import { aboutData } from "../data/about";
import { CategoryPage } from "../pages/CategoryPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { PostDetailPage } from "../pages/PostDetailPage";
import { PostEditorPage } from "../pages/PostEditorPage";
import { SearchPage } from "../pages/SearchPage";
import { UserProfilePage } from "../pages/UserProfilePage";
import { VerifyEmailPage } from "../pages/VerifyEmailPage";
import { useAuth } from "../hooks/useAuth";

function ProfileRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? `/users/${user.id}` : "/login"} replace />;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/verify-email", element: <VerifyEmailPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/index", element: <HomePage /> },
      ...(aboutData.enabled ? [{ path: "/about", element: <AboutPage /> }] : []),
      { path: "/categories", element: <CategoryPage /> },
      { path: "/posts/search", element: <SearchPage /> },
      { path: "/posts/:id", element: <PostDetailPage /> },
      { path: "/users/:id", element: <UserProfilePage /> },
      {
        element: <ProtectedRoute />,
        children: [

          { path: "/posts/new", element: <PostEditorPage /> },
          { path: "/posts/:id/edit", element: <PostEditorPage /> },
          { path: "/profile", element: <ProfileRedirect /> },
        ]
      },
      {
        element: <AdminRoute />,
        children: [
          { path: "/admin/users", element: <AdminUsersPage /> }
        ]
      }
    ]
  }
]);
