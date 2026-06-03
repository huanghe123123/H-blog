import { Button, Card, Form, Input, Tabs, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import { login, register } from "../api/auth";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const onLogin = async (values: { identifier: string; password: string }) => {
    await login(values);
    await refresh();
    navigate("/");
  };

  const onRegister = async (values: { username: string; email: string; password: string }) => {
    await register(values);
    await login({ identifier: values.username, password: values.password });
    await refresh();
    message.success("注册成功");
    navigate("/");
  };

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <Typography.Title level={2}>huanghe123123's blog</Typography.Title>
        <Tabs
          items={[
            {
              key: "login",
              label: "登录",
              children: (
                <Form layout="vertical" onFinish={onLogin}>
                  <Form.Item name="identifier" label="用户名或邮箱" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="password" label="密码" rules={[{ required: true, min: 8 }]}>
                    <Input.Password />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block>登录</Button>
                </Form>
              )
            },
            {
              key: "register",
              label: "注册",
              children: (
                <Form layout="vertical" onFinish={onRegister}>
                  <Form.Item name="username" label="用户名" rules={[{ required: true, min: 3 }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="email" label="邮箱" rules={[{ required: true, type: "email" }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="password" label="密码" rules={[{ required: true, min: 8 }]}>
                    <Input.Password />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block>注册并登录</Button>
                </Form>
              )
            }
          ]}
        />
      </Card>
    </main>
  );
}
