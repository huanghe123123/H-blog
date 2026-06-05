import { Navigate } from "react-router-dom";
import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AppLayout } from "../layouts/AppLayout";
import { AdminUsersPage } from "../pages/AdminUsersPage";
import { CategoryPage } from "../pages/CategoryPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { PostDetailPage } from "../pages/PostDetailPage";
import { PostEditorPage } from "../pages/PostEditorPage";
import { SearchPage } from "../pages/SearchPage";
import { UserProfilePage } from "../pages/UserProfilePage";
import { useAuth } from "../hooks/useAuth";

function ProfileRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? `/users/${user.id}` : "/login"} replace />;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/index", element: <HomePage /> },
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
          { path: "/admin/users", element: <AdminUsersPage /> }
        ]
      }
    ]
  }
]);
