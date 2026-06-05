import { Button, Card, Result, Spin, Typography } from "antd";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail } from "../api/auth";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  if (!token || status === "error") {
    return (
      <main className="auth-page">
        <Card className="auth-card">
          <Result
            status="error"
            title="验证失败"
            subTitle="验证链接无效或已过期，请回到登录页重新发送验证邮件"
            extra={<Link to="/login"><Button type="primary">返回登录</Button></Link>}
          />
        </Card>
      </main>
    );
  }

  if (status === "loading") {
    return (
      <main className="auth-page">
        <Card className="auth-card" style={{ textAlign: "center", padding: 60 }}>
          <Spin size="large" />
          <Typography.Paragraph style={{ marginTop: 16 }}>正在验证邮箱…</Typography.Paragraph>
        </Card>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <Result
          status="success"
          title="邮箱验证成功"
          subTitle="现在可以登录了"
          extra={<Link to="/login"><Button type="primary">前往登录</Button></Link>}
        />
      </Card>
    </main>
  );
}
