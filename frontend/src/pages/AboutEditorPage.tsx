import { Button, DatePicker, Form, Input, Select, Space, message } from "antd";
import dayjs from "dayjs";
import { Edit3, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LinkEditorModal } from "../components/LinkEditorModal";
import { aboutData } from "../data/about";
import type { UserLink } from "../types";

export function AboutEditorPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [editLinks, setEditLinks] = useState<UserLink[]>(aboutData.links);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editingLinkIdx, setEditingLinkIdx] = useState<number | null>(null);

  const onFinish = async (values: { nickname?: string; avatar_url?: string; bio?: string; birthday?: dayjs.Dayjs; gender?: string }) => {
    const payload: Record<string, unknown> = { ...values };
    if (values.birthday) {
      payload.birthday = values.birthday.format("YYYY-MM-DD");
    }
    payload.links = editLinks.length > 0 ? editLinks : [];

    const res = await fetch("/api/about/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("写入失败");
    message.success("已写入源码，Vite HMR 将自动刷新");
    navigate("/about");
  };

  return (
    <section style={{ maxWidth: 720, margin: "0 auto" }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          nickname: aboutData.nickname,
          avatar_url: aboutData.avatar_url,
          bio: aboutData.bio,
          birthday: aboutData.birthday ? dayjs(aboutData.birthday) : undefined,
          gender: aboutData.gender,
        }}
      >
        <Form.Item label="昵称" name="nickname">
          <Input maxLength={80} />
        </Form.Item>
        <Form.Item label="头像 URL" name="avatar_url">
          <Input maxLength={500} />
        </Form.Item>
        <Form.Item label="个人简介" name="bio">
          <Input.TextArea rows={5} maxLength={2000} />
        </Form.Item>
        <Form.Item label="生日" name="birthday">
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="性别" name="gender">
          <Select allowClear placeholder="请选择性别">
            <Select.Option value="male">男</Select.Option>
            <Select.Option value="female">女</Select.Option>
            <Select.Option value="other">其他</Select.Option>
          </Select>
        </Form.Item>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>个人链接</div>
          {editLinks.map((link, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "6px 10px", background: "var(--bg)", borderRadius: 6 }}>
              <i className={link.icon} style={{ fontSize: 18, width: 24, textAlign: "center" }} />
              <span style={{ flex: 1, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link.label}</span>
              <Button type="text" size="small" icon={<Edit3 size={14} />}
                onClick={() => { setEditingLinkIdx(i); setLinkModalOpen(true); }} />
              <Button type="text" danger size="small" icon={<Trash2 size={14} />}
                onClick={() => setEditLinks((prev) => prev.filter((_, j) => j !== i))} />
            </div>
          ))}
          <Button type="dashed" onClick={() => { setEditingLinkIdx(null); setLinkModalOpen(true); }} style={{ marginTop: 4 }}>
            添加个人链接
          </Button>
        </div>
        <Space>
          <Button type="primary" htmlType="submit">写入源码</Button>
          <Button onClick={() => navigate("/about")}>取消</Button>
        </Space>
      </Form>
      <LinkEditorModal
        open={linkModalOpen}
        initial={editingLinkIdx !== null ? editLinks[editingLinkIdx] : null}
        onSave={(link) => {
          if (editingLinkIdx !== null) {
            setEditLinks((prev) => prev.map((l, i) => (i === editingLinkIdx ? link : l)));
          } else {
            setEditLinks((prev) => [...prev, link]);
          }
          setLinkModalOpen(false);
          setEditingLinkIdx(null);
        }}
        onCancel={() => { setLinkModalOpen(false); setEditingLinkIdx(null); }}
      />
    </section>
  );
}
