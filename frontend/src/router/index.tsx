import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AppLayout } from "../layouts/AppLayout";
import { AdminUsersPage } from "../pages/AdminUsersPage";
import { LoginPage } from "../pages/LoginPage";
import { PostDetailPage } from "../pages/PostDetailPage";
import { PostEditorPage } from "../pages/PostEditorPage";
import { PostListPage } from "../pages/PostListPage";
import { ProfilePage } from "../pages/ProfilePage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <PostListPage /> },
          { path: "/posts/new", element: <PostEditorPage /> },
          { path: "/posts/:id", element: <PostDetailPage /> },
          { path: "/posts/:id/edit", element: <PostEditorPage /> },
          { path: "/profile", element: <ProfilePage /> },
          { path: "/admin/users", element: <AdminUsersPage /> }
        ]
      }
    ]
  }
]);
