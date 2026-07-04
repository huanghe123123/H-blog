import { Button, Card, Input, Space, Spin, Typography } from "antd";
import { SendOutlined, CloseOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import { api } from "../api/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "agent_chat_history";

function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m: unknown): m is Message =>
        typeof m === "object" && m !== null &&
        typeof (m as Message).role === "string" &&
        ((m as Message).role === "user" || (m as Message).role === "assistant") &&
        typeof (m as Message).content === "string"
    );
  } catch {
    return [];
  }
}

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
  const [messages, setMessages] = useState<Message[]>(loadHistory);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  useEffect(() => {
    const handler = () => setOpen((prev) => !prev);
    window.addEventListener("toggle-agent-chat", handler);
    return () => window.removeEventListener("toggle-agent-chat", handler);
  }, []);

  // Persist messages to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // localStorage unavailable or quota exceeded — silently ignore
    }
  }, [messages]);

  // Drag: start on title bar pointerdown
  const onTitlePointerDown = useCallback((e: React.PointerEvent) => {
    const card = cardRef.current;
    if (!card) return;
    e.preventDefault();
    const rect = card.getBoundingClientRect();
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
    };
    card.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.active) return;
    setPos({
      x: d.origX + e.clientX - d.startX,
      y: d.origY + e.clientY - d.startY,
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current.active = false;
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
      const { data } = await api.post("/agent", { message: text, context, history: messages });
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

  const panelStyle: React.CSSProperties = {
    position: "fixed",
    width: 380,
    maxHeight: "70vh",
    zIndex: 1000,
    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
    borderRadius: 12,
    cursor: "auto",
    userSelect: "auto",
  };

  if (pos) {
    panelStyle.left = pos.x;
    panelStyle.top = pos.y;
    panelStyle.bottom = "auto";
    panelStyle.right = "auto";
  } else {
    panelStyle.bottom = 24;
    panelStyle.right = 24;
  }

  return (
    <Card
      ref={cardRef}
      title={
        <div
          onPointerDown={onTitlePointerDown}
          style={{ cursor: "move", userSelect: "none", margin: "-20px", padding: "20px" }}
        >
          <Space>
            <span>AI 助手</span>
            <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
              (测试版)
            </Typography.Text>
          </Space>
        </div>
      }
      extra={
        <Space size={4}>
          {messages.length > 0 && (
            <Button type="text" size="small" danger onClick={() => { setMessages([]); try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } }}>
              结束对话
            </Button>
          )}
          <Button type="text" icon={<CloseOutlined />} onClick={() => setOpen(false)} />
        </Space>
      }
      style={panelStyle}
      bodyStyle={{ padding: 12, display: "flex", flexDirection: "column", maxHeight: "calc(70vh - 57px)" }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
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
            {m.role === "user" ? (
              <div
                style={{
                  display: "inline-block",
                  maxWidth: "90%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "#49B1F5",
                  color: "#fff",
                  fontSize: 14,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {m.content}
              </div>
            ) : (
              <div
                data-color-mode="light"
                style={{
                  display: "inline-block",
                  maxWidth: "90%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "var(--bg)",
                  fontSize: 14,
                }}
              >
                <MDEditor.Markdown source={m.content} />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ textAlign: "center", padding: 8 }}>
            <Spin size="small" />
          </div>
        )}
      </div>

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
  );
}
