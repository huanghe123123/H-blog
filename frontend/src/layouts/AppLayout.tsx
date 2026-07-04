import { Avatar, Button, Form, Input, Layout, Modal, Space, Typography, message } from "antd";
import { Heart, Info, Layers, LogOut, Newspaper, Pencil, Search, Shield, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { fetchSiteConfig } from "../api/config";
import { updatePassword } from "../api/users";
import { AgentChat } from "../components/AgentChat";
import { aboutData } from "../data/about";
import { useAuth } from "../hooks/useAuth";
import { PostListPage } from "../pages/PostListPage";

const { Header, Content, Footer } = Layout;

export function AppLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [siteName, setSiteName] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [setupPasswordOpen, setSetupPasswordOpen] = useState(false);
  const [setupPasswordSubmitting, setSetupPasswordSubmitting] = useState(false);
  const [setupPasswordForm] = Form.useForm();
  const fabRef = useRef<HTMLDivElement>(null);
  const [fabPos, setFabPos] = useState<{ left: number; top: number } | null>(null);
  const fabDragRef = useRef({ active: false, startX: 0, startY: 0, origLeft: 0, origTop: 0 });

  useEffect(() => {
    fetchSiteConfig().then((cfg) => setSiteName(cfg.site_name));
  }, []);

  useEffect(() => {
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(location.search);
    if (params.has("setup_password") && user) {
      setSetupPasswordOpen(true);
    }
  }, [loading, location.search, user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has("keyword") && location.pathname !== "/posts/search") {
      const keyword = params.get("keyword") || "";
      navigate(`/posts/search?keyword=${encodeURIComponent(keyword)}`, { replace: true });
    }
  }, [location.pathname, location.search]);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/" || location.pathname === "/index";
    return location.pathname.startsWith(path);
  };

  const agentContext = useMemo(() => {
    const path = location.pathname;
    const match = path.match(/^\/posts\/(\d+)/);
    if (match) return { page: "post_detail", post_id: Number(match[1]) };
    const userMatch = path.match(/^\/users\/(\d+)/);
    if (userMatch) return { page: "user_profile", user_id: Number(userMatch[1]) };
    if (path === "/" || path === "/index") return { page: "home" };
    if (path.startsWith("/categories") || path.startsWith("/posts/search")) return { page: "post_list" };
    return { page: "unknown" };
  }, [location.pathname]);

  const onSetupPassword = async (values: { password: string; confirm: string }) => {
    if (values.password !== values.confirm) {
      message.error("两次输入的密码不一致");
      return;
    }
    setSetupPasswordSubmitting(true);
    try {
      await updatePassword(values.password);
      message.success("密码设置成功");
      setSetupPasswordOpen(false);
      setupPasswordForm.resetFields();
      navigate(location.pathname, { replace: true });
    } catch {
      message.error("密码设置失败，请稍后重试");
    } finally {
      setSetupPasswordSubmitting(false);
    }
  };

  const onFabPointerDown = useCallback((e: React.PointerEvent) => {
    const el = fabRef.current;
    if (!el) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    fabDragRef.current = { active: true, startX: e.clientX, startY: e.clientY, origLeft: rect.left, origTop: rect.top };
    el.setPointerCapture(e.pointerId);
  }, []);

  const onFabPointerMove = useCallback((e: React.PointerEvent) => {
    const d = fabDragRef.current;
    if (!d.active) return;
    setFabPos({ left: d.origLeft + e.clientX - d.startX, top: d.origTop + e.clientY - d.startY });
  }, []);

  const onFabPointerUp = useCallback((e: React.PointerEvent) => {
    const d = fabDragRef.current;
    d.active = false;
    if (Math.abs(e.clientX - d.startX) < 5 && Math.abs(e.clientY - d.startY) < 5) {
      navigate("/posts/new");
    }
  }, [navigate]);

  const navLinks = user
    ? [
        { path: "/", icon: <Newspaper size={18} />, label: "主页" },
        { path: "/categories", icon: <Layers size={18} />, label: "分类" },
        ...(aboutData.enabled ? [{ path: "/about", icon: <Info size={18} />, label: "关于" }] : []),
        ...(user.role === "admin" || user.role === "owner" ? [{ path: "/admin/users", icon: <Shield size={18} />, label: "用户管理" }] : [])
      ]
    : [
        { path: "/", icon: <Newspaper size={18} />, label: "主页" },
        { path: "/categories", icon: <Layers size={18} />, label: "分类" },
        ...(aboutData.enabled ? [{ path: "/about", icon: <Info size={18} />, label: "关于" }] : []),
      ];

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
      <Footer className="app-footer">
        <span className="footer-left">
          <span>{siteName}</span>
          <span className="footer-author">© {new Date().getFullYear()} <a href="https://github.com/huanghe123123">huanghe123123</a></span>
        </span>
        <span className="footer-powered">
          <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans" target="_blank" rel="noopener noreferrer">CC BY-NC-SA 4.0</a> | Powered by <a href="https://ant.design" target="_blank" rel="noopener noreferrer">Ant Design</a> & <a href="https://fastapi.tiangolo.com" target="_blank" rel="noopener noreferrer">FastAPI</a>
        </span>
      </Footer>
      <Modal open={searchOpen} onCancel={() => setSearchOpen(false)} footer={null} width="90vw" style={{ top: 24 }}>
        <PostListPage showCreateButton={false} syncUrl={false} />
      </Modal>
      <Modal
        open={setupPasswordOpen}
        title="设置登录密码"
        closable={false}
        maskClosable={false}
        footer={null}
        width={400}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          你的账号通过 GitHub 授权创建，请设置一个密码，之后即可用邮箱+密码登录。
        </Typography.Paragraph>
        <Form form={setupPasswordForm} layout="vertical" onFinish={onSetupPassword}>
          <Form.Item name="password" label="密码" rules={[{ required: true, min: 8, max: 128, message: "密码至少 8 位" }]}>
            <Input.Password placeholder="至少 8 位" />
          </Form.Item>
          <Form.Item name="confirm" label="确认密码" rules={[{ required: true }, { validator: (_, value) => value === setupPasswordForm.getFieldValue("password") ? Promise.resolve() : Promise.reject("两次输入的密码不一致") }]}>
            <Input.Password placeholder="再次输入密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={setupPasswordSubmitting}>
            设置密码
          </Button>
        </Form>
      </Modal>
      {user && (
        <div
          ref={fabRef}
          onPointerDown={onFabPointerDown}
          onPointerMove={onFabPointerMove}
          onPointerUp={onFabPointerUp}
          onPointerCancel={onFabPointerUp}
          style={{
            position: "fixed",
            zIndex: 100,
            cursor: "move",
            ...(fabPos
              ? { left: fabPos.left, top: fabPos.top, bottom: "auto", right: "auto" }
              : { bottom: 32, right: 32 }),
          }}
        >
          <Button
            shape="circle"
            icon={<Pencil size={24} />}
            style={{ width: 56, height: 56, boxShadow: "0 2px 12px rgba(0,0,0,.18)" }}
          />
        </div>
      )}
      {user && <AgentChat context={agentContext} />}
    </Layout>
  );
}
