import { Button, Card, Divider, Form, Input, Tabs, Typography, message } from "antd";
import { GithubOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../api/auth";
import { fetchSiteConfig } from "../api/config";
import { useAuth } from "../hooks/useAuth";
import axios from "axios";

export function LoginPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [registerForm] = Form.useForm();
  const [siteName, setSiteName] = useState("");

  useEffect(() => {
    fetchSiteConfig().then((cfg) => setSiteName(cfg.site_name));
  }, []);

  const onLogin = async (values: { identifier: string; password: string }) => {
    try {
      await login(values);
      await refresh();
      navigate("/");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 429) {
          message.error(err.response.data?.detail || "请求过于频繁，请稍后再试");
        } else if (err.response?.status === 401) {
          message.error("用户名或密码错误");
        } else {
          message.error("登录失败，请稍后重试");
        }
      } else {
        message.error("登录失败，请稍后重试");
      }
    }
  };

  const onRegister = async (values: { username: string; email: string; password: string }) => {
    registerForm.setFields([
      { name: "username", errors: [] },
      { name: "email", errors: [] },
    ]);
    try {
      await register(values);
      message.success("注册成功！请检查邮箱完成验证后再登录");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          const detail = err.response.data?.detail;
          if (detail?.field) {
            registerForm.setFields([
              { name: detail.field, errors: [detail.message] },
            ]);
          }
        } else if (err.response?.status === 429) {
          message.error(err.response.data?.detail || "请求过于频繁，请稍后再试");
        } else {
          message.error("注册失败，请稍后重试");
        }
      } else {
        message.error("注册失败，请稍后重试");
      }
    }
  };

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <Typography.Title level={2}>{siteName}</Typography.Title>
        <Tabs
          items={[
            {
              key: "login",
              label: "登录",
              children: (
                <Form layout="vertical" onFinish={onLogin}>
                  <Form.Item name="identifier" label="用户名 / 昵称 / 邮箱" rules={[{ required: true }]}>
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
                <Form form={registerForm} layout="vertical" onFinish={onRegister}>
                  <Form.Item name="username" label="用户名" rules={[{ required: true, min: 3 }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="email" label="邮箱" rules={[{ required: true, type: "email" }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="password" label="密码" rules={[{ required: true, min: 8 }]}>
                    <Input.Password />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block>注册</Button>
                </Form>
              )
            }
          ]}
        />
        <Divider plain>或</Divider>
        <Button block icon={<GithubOutlined />} onClick={() => {
          window.location.href = `${import.meta.env.VITE_API_BASE_URL ?? "/api"}/auth/github`;
        }}>
          使用 GitHub 登录
        </Button>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Button type="link" onClick={() => navigate("/")}>暂不登录</Button>
        </div>
      </Card>
    </main>
  );
}
