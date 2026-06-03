import MDEditor from "@uiw/react-md-editor";
import { Button, Card, Form, Input, List, Select, Typography, message } from "antd";
import dayjs from "dayjs";
import { FileText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createPost, getPost, listPosts, updatePost } from "../api/posts";
import type { PostPayload } from "../api/posts";
import type { Post, PostStatus } from "../types";

export function PostEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm<PostPayload>();
  const [content, setContent] = useState("");
  const [drafts, setDrafts] = useState<Post[]>([]);

  const loadDrafts = useCallback(async () => {
    setDrafts(await listPosts({ status: "draft" as PostStatus }));
  }, []);

  useEffect(() => {
    loadDrafts();
    if (!id) {
      form.resetFields();
      setContent("");
      return;
    }
    getPost(Number(id)).then((post) => {
      form.setFieldsValue({
        title: post.title,
        summary: post.summary || undefined,
        content: post.content,
        cover_url: post.cover_url || undefined,
        status: post.status
      });
      setContent(post.content);
    });
  }, [id, form, loadDrafts]);

  const onFinish = async (values: PostPayload) => {
    const payload = { ...values, content };
    const post = id ? await updatePost(Number(id), payload) : await createPost(payload);
    message.success("已保存");
    navigate(`/posts/${post.id}`);
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
      status: draft.status
    });
    setContent(draft.content);
    navigate(`/posts/${draft.id}/edit`, { replace: true });
  };

  return (
    <section>
      <div>
        <Typography.Title level={2}>{id ? "编辑文章" : "新建文章"}</Typography.Title>
        <Form form={form} layout="vertical" initialValues={{ status: "draft" }} onFinish={onFinish}>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="summary" label="摘要">
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
          <Form.Item name="cover_url" label="封面 URL">
            <Input maxLength={500} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select options={[{ value: "draft", label: "草稿" }, { value: "published", label: "发布" }]} />
          </Form.Item>
          <div className="editor-wrap" data-color-mode="light">
            <MDEditor value={content} onChange={(value) => setContent(value || "")} height={420} />
          </div>
          <Button type="primary" htmlType="submit" className="submit-btn">保存</Button>
        </Form>
      </div>
      <Card
        title="草稿箱"
        style={{
          width: 260,
          position: "fixed",
          right: 0,
          top: 80,
          maxHeight: "calc(100vh - 104px)",
          overflow: "auto",
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
                  title={draft.title || "无标题"}
                  description={dayjs(draft.updated_at).format("MM-DD HH:mm")}
                />
              </List.Item>
            )}
          />
        </Card>
    </section>
  );
}
