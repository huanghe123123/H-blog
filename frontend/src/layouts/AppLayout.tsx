import { Avatar, Button, Layout, Modal, Space, Typography } from "antd";
import { LogOut, Newspaper, Pencil, Search, Shield, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { fetchSiteConfig } from "../api/config";
import { useAuth } from "../hooks/useAuth";
import { PostListPage } from "../pages/PostListPage";

const { Header, Content } = Layout;

export function AppLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [siteName, setSiteName] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    fetchSiteConfig().then((cfg) => setSiteName(cfg.site_name));
  }, []);

  useEffect(() => {
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has("keyword") && location.pathname !== "/posts/search") {
      const keyword = params.get("keyword") || "";
      navigate(`/posts/search?keyword=${encodeURIComponent(keyword)}`, { replace: true });
    }
  }, [location.pathname, location.search]);

  const isActive = (path: string) => location.pathname === path || (path === "/" && !location.pathname.startsWith("/admin"));

  const navLinks = user
    ? [
        { path: "/", icon: <Newspaper size={18} />, label: "主页" },
        ...(user.role === "admin" || user.role === "owner" ? [{ path: "/admin/users", icon: <Shield size={18} />, label: "用户管理" }] : [])
      ]
    : [{ path: "/", icon: <Newspaper size={18} />, label: "文章" }];

  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <div className="header-left">
          <Typography.Title level={4} className="brand">{siteName}</Typography.Title>
          <nav className="header-nav">
            {navLinks.map((link) => (
              <Link key={link.path} to={link.path} className={`header-nav-link${isActive(link.path) ? " active" : ""}`}>
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <Space className="header-right">
          <Button type="text" icon={<Search size={16} />} onClick={() => setSearchOpen(true)} />
          {loading ? null : user ? (
            <>
              <Avatar src={user.avatar_url} icon={<UserRound />} style={{ cursor: "pointer" }} onClick={() => navigate(`/users/${user.id}`)} />
              <Typography.Text strong>{user.nickname || user.username}</Typography.Text>
              <Button type="text" icon={<LogOut size={16} />} onClick={() => { logout(); navigate("/login"); }} />
            </>
          ) : (
            <Button type="primary" onClick={() => navigate("/login")}>登录</Button>
          )}
        </Space>
      </Header>
      <Content className="app-content">
        <Outlet />
      </Content>
      <Modal open={searchOpen} onCancel={() => setSearchOpen(false)} footer={null} width="90vw" style={{ top: 24 }}>
        <PostListPage showCreateButton={false} syncUrl={false} />
      </Modal>
      {user && (
        <Button
          className="fab"
          shape="circle"
          icon={<Pencil size={24} />}
          onClick={() => navigate("/posts/new")}
          style={{ width: 56, height: 56 }}
        />
      )}
    </Layout>
  );
}
