import { Button, Layout, Menu, Space, Typography } from "antd";
import { Edit3, LogOut, Newspaper, Shield, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { fetchSiteConfig } from "../api/config";
import { useAuth } from "../hooks/useAuth";

const { Header, Content, Sider } = Layout;

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [siteName, setSiteName] = useState("");

  useEffect(() => {
    fetchSiteConfig().then((cfg) => setSiteName(cfg.site_name));
  }, []);

  return (
    <Layout className="app-shell">
      <Sider width={232} className="app-sider">
        <Typography.Title level={3} className="brand">{siteName}</Typography.Title>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname.startsWith("/admin") ? "/admin/users" : location.pathname.startsWith("/posts/new") ? "/posts/new" : location.pathname.startsWith("/profile") ? "/profile" : "/"]}
          items={[
            { key: "/", icon: <Newspaper size={18} />, label: <Link to="/">文章</Link> },
            { key: "/posts/new", icon: <Edit3 size={18} />, label: <Link to="/posts/new">写文章</Link> },
            { key: "/profile", icon: <UserRound size={18} />, label: <Link to="/profile">资料</Link> },
            ...(user?.role === "admin" ? [{ key: "/admin/users", icon: <Shield size={18} />, label: <Link to="/admin/users">用户管理</Link> }] : [])
          ]}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Space>
            <Typography.Text strong>{user?.nickname || user?.username}</Typography.Text>
            <Button
              icon={<LogOut size={16} />}
              onClick={() => {
                logout();
                navigate("/login");
              }}
            />
          </Space>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
