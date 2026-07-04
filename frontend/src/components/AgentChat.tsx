import { Button, Card, Input, Space, Spin, Typography } from "antd";
import { SendOutlined, CloseOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Helper to access oml2d instance exposed by main.tsx
function getOml2d() {
  return (window as unknown as Record<string, { tipsMessage?: (msg: string, duration: number, priority: number) => void }>).__oml2d;
}

function showTip(msg: string) {
  const oml2d = getOml2d();
  if (oml2d?.tipsMessage) {
    oml2d.tipsMessage(msg, 3000, 1);
  }
}

export function AgentChat({ context }: { context?: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Listen for toggle event from oml2d menu
  useEffect(() => {
    const handler = () => setOpen((prev) => !prev);
    window.addEventListener("toggle-agent-chat", handler);
    return () => window.removeEventListener("toggle-agent-chat", handler);
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    showTip("让我想想...");
    try {
      const { data } = await api.post("/agent", { message: text, context });
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      showTip("完成啦~");
    } catch (err: unknown) {
      let detail = "AI 服务暂时不可用";
      const e = err as { code?: string; response?: { data?: { detail?: string }; status?: number } };
      if (e.code === "ECONNABORTED" || e.code === "ERR_CANCELED") {
        detail = "请求超时，AI 服务响应较慢，请稍后重试";
      } else if (e.response?.data?.detail) {
        detail = e.response.data.detail;
      } else if (e.response?.status === 401) {
        detail = "请先登录";
      }
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${detail}` }]);
      showTip("唔...出错了");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
        <Card
          title={
            <Space>
              <span>AI 助手</span>
              <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                (测试版)
              </Typography.Text>
            </Space>
          }
          extra={<Button type="text" icon={<CloseOutlined />} onClick={() => setOpen(false)} />}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1000,
            width: 380,
            maxHeight: "70vh",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            borderRadius: 12,
          }}
          bodyStyle={{ padding: 12, display: "flex", flexDirection: "column", maxHeight: "calc(70vh - 57px)" }}
        >
          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              minHeight: 200,
              maxHeight: "calc(70vh - 140px)",
              marginBottom: 12,
            }}
          >
            {messages.length === 0 && (
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                你好！我是 AI 助手，可以帮你搜索文章、查看内容、管理博客。试试问我吧～
              </Typography.Text>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 10,
                  textAlign: m.role === "user" ? "right" : "left",
                }}
              >
                <div
                  style={{
                    display: "inline-block",
                    maxWidth: "90%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: m.role === "user" ? "#49B1F5" : "var(--bg)",
                    color: m.role === "user" ? "#fff" : "var(--text)",
                    fontSize: 14,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ textAlign: "center", padding: 8 }}>
                <Spin size="small" />
              </div>
            )}
          </div>

          {/* Input */}
          <Space.Compact style={{ width: "100%" }}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={send}
              placeholder="输入消息..."
              disabled={loading}
              maxLength={2000}
            />
            <Button type="primary" icon={<SendOutlined />} onClick={send} loading={loading} />
          </Space.Compact>
        </Card>
    </>
  );
}
