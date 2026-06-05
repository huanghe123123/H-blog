import MDEditor from "@uiw/react-md-editor";
import { Button, Card, Form, Input, List, Select, Space, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { ArrowLeft, FileText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createPost, getPost, listPosts, TAG_PRESETS, updatePost } from "../api/posts";
import type { PostPayload } from "../api/posts";
import { useAuth } from "../hooks/useAuth";
import type { Post, PostCategory, PostStatus } from "../types";

export function PostEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form] = Form.useForm<Omit<PostPayload, "status">>();
  const [content, setContent] = useState("");
  const [drafts, setDrafts] = useState<Post[]>([]);
  const [editingStatus, setEditingStatus] = useState<PostStatus | null>(null);

  const loadDrafts = useCallback(async () => {
    try {
      setDrafts(await listPosts({ status: "draft" as PostStatus }));
    } catch { /* 草稿加载失败不影响编辑 */ }
  }, []);

  useEffect(() => {
    loadDrafts();
    if (!id) {
      form.resetFields();
      setContent("");
      setEditingStatus(null);
      return;
    }
    getPost(Number(id)).then((post) => {
      form.setFieldsValue({
        title: post.title,
        summary: post.summary || undefined,
        content: post.content,
        cover_url: post.cover_url || undefined,
        tags: post.tags || undefined,
        category: post.category,
      });
      setContent(post.content);
      setEditingStatus(post.status);
    });
  }, [id, form, loadDrafts]);

  const submit = async (status: PostStatus) => {
    if (!content || !content.replace(/<[^>]*>/g, "").trim()) {
      message.warning("内容不可为空");
      return;
    }
    try {
      const values = await form.validateFields();
      const payload = { ...values, content, status };
      const post = id ? await updatePost(Number(id), payload) : await createPost(payload);
      message.success(status === "published" ? "已发布" : "草稿已保存");
      navigate(`/posts/${post.id}`);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errorFields" in err) return; // form validation error, antd shows inline
      message.error("操作失败，请稍后重试");
    }
  };

  const loadDraft = (draft: Post) => {
    if (id && Number(id) === draft.id) {
      navigate("/posts/new", { replace: true });
      return;
    }
    form.setFieldsValue({
      title: draft.title,
      summary: draft.summary || undefined,
      content: draft.content,
      cover_url: draft.cover_url || undefined,
      tags: draft.tags || undefined,
      category: draft.category,
    });
    setContent(draft.content);
    setEditingStatus("draft");
    navigate(`/posts/${draft.id}/edit`, { replace: true });
  };

  return (
    <section className="editor-layout">
      <div className="editor-main">
        <Button type="text" icon={<ArrowLeft size={18} />} onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
          返回
        </Button>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="summary" label="摘要">
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
          <Form.Item name="cover_url" label="封面 URL">
            <Input maxLength={500} />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true, message: "请选择分类" }]}>
            <Select
              placeholder="选择分类"
              options={(["技术", "创作", "生活", "交流", "公告"] as PostCategory[]).map((cat) => ({
                value: cat,
                label: cat,
                disabled: cat === "公告" && user?.role !== "moderator" && user?.role !== "admin" && user?.role !== "owner",
              }))}
            />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入标签后按回车" style={{ width: "100%" }} />
          </Form.Item>
          <div style={{ marginTop: -16, marginBottom: 16 }}>
            <Space size={4} wrap>
              {TAG_PRESETS.map((tag) => (
                <Tag
                  key={tag}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    const current: string[] = form.getFieldValue("tags") || [];
                    if (!current.includes(tag)) {
                      form.setFieldValue("tags", [...current, tag]);
                    }
                  }}
                >
                  + {tag}
                </Tag>
              ))}
            </Space>
          </div>
          <div className="editor-wrap" data-color-mode="light">
            <MDEditor value={content} onChange={(value) => setContent(value || "")} height={420} />
          </div>
          <Space className="submit-btn">
            <Button onClick={() => submit("draft")}>保存草稿</Button>
            <Button type="primary" onClick={() => submit("published")}>发布</Button>
          </Space>
        </Form>
      </div>
      <Card
        title="草稿箱"
        className="draft-sidebar"
        style={{
          width: 260,
          position: "sticky",
          top: 16,
          maxHeight: "calc(100vh - 104px)",
          overflow: "auto",
          flexShrink: 0,
        }}
      >
        <List
          dataSource={drafts}
          locale={{ emptyText: "暂无草稿" }}
          renderItem={(draft) => (
            <List.Item
              style={{
                cursor: "pointer",
                padding: "8px 8px",
                borderRadius: 4,
                background: id && Number(id) === draft.id ? "#e6f4ff" : undefined,
              }}
              onClick={() => loadDraft(draft)}
            >
              <List.Item.Meta
                avatar={<FileText size={16} />}
                title={
                  <Space>
                    {draft.title || "无标题"}
                    <Tag color="orange">草稿</Tag>
                  </Space>
                }
                description={dayjs(draft.updated_at).format("MM-DD HH:mm")}
              />
            </List.Item>
          )}
        />
      </Card>
    </section>
  );
}
