import { Avatar, Button, Layout, Menu, Space, Typography } from "antd";
import { ChevronLeft, ChevronRight, Edit3, LogOut, Newspaper, Shield, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { fetchSiteConfig } from "../api/config";
import { useAuth } from "../hooks/useAuth";

const { Header, Content, Sider } = Layout;

export function AppLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [siteName, setSiteName] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetchSiteConfig().then((cfg) => setSiteName(cfg.site_name));
  }, []);

  const handleCollapse = useCallback((value: boolean) => {
    setCollapsed(value);
  }, []);

  const menuItems = user
    ? [
        { key: "/", icon: <Newspaper size={18} />, label: <Link to="/">文章</Link> },
        { key: "/posts/new", icon: <Edit3 size={18} />, label: <Link to="/posts/new">写文章</Link> },
        { key: `/users/${user.id}`, icon: <UserRound size={18} />, label: <Link to={`/users/${user.id}`}>资料</Link> },
        ...(user.role === "admin" ? [{ key: "/admin/users", icon: <Shield size={18} />, label: <Link to="/admin/users">用户管理</Link> }] : [])
      ]
    : [{ key: "/", icon: <Newspaper size={18} />, label: <Link to="/">文章</Link> }];

  const selectedKey = location.pathname.startsWith("/admin")
    ? "/admin/users"
    : location.pathname.startsWith("/posts/new") || location.pathname.includes("/edit")
      ? "/posts/new"
      : location.pathname.startsWith("/users")
        ? `/users/${user?.id ?? ""}`
        : "/";

  return (
    <Layout className="app-shell">
      <Sider
        width={232}
        collapsedWidth={80}
        breakpoint="lg"
        collapsible
        collapsed={collapsed}
        onCollapse={handleCollapse}
        trigger={null}
        className="app-sider"
      >
        <div style={{ position: "relative", height: "100%" }}>
          <Typography.Title level={3} className="brand">{collapsed ? "" : siteName}</Typography.Title>
          <Menu mode="inline" selectedKeys={[selectedKey]} items={menuItems} inlineCollapsed={collapsed} />
          <Button
            className="sider-toggle"
            type="text"
            icon={collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            onClick={() => setCollapsed(!collapsed)}
          />
        </div>
      </Sider>
      <Layout>
        <Header className="app-header">
          <Space>
            {loading ? null : user ? (
              <>
                <Avatar src={user.avatar_url} icon={<UserRound />} style={{ cursor: "pointer" }} onClick={() => navigate(`/users/${user.id}`)} />
                <Typography.Text strong>{user.nickname || user.username}</Typography.Text>
                <Button icon={<LogOut size={16} />} onClick={() => { logout(); navigate("/login"); }} />
              </>
            ) : (
              <Button type="primary" onClick={() => navigate("/login")}>登录</Button>
            )}
          </Space>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
