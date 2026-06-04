import { Avatar, Button, Layout, Menu, Modal, Space, Typography } from "antd";
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

  const menuItems = user
    ? [
        { key: "/", icon: <Newspaper size={18} />, label: <Link to="/">文章</Link> },
        { key: `/users/${user.id}`, icon: <UserRound size={18} />, label: <Link to={`/users/${user.id}`}>资料</Link> },
        ...(user.role === "admin" ? [{ key: "/admin/users", icon: <Shield size={18} />, label: <Link to="/admin/users">用户管理</Link> }] : [])
      ]
    : [{ key: "/", icon: <Newspaper size={18} />, label: <Link to="/">文章</Link> }];

  const selectedKey = location.pathname.startsWith("/admin")
    ? "/admin/users"
    : location.pathname.startsWith("/users")
      ? `/users/${user?.id ?? ""}`
      : "/";

  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <div className="header-left">
          <Typography.Title level={4} className="brand">{siteName}</Typography.Title>
          <Menu mode="horizontal" selectedKeys={[selectedKey]} items={menuItems} className="header-menu" />
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
        <PostListPage showCreateButton={false} />
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
