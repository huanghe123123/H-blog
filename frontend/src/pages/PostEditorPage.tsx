import MDEditor from "@uiw/react-md-editor";
import { Button, Form, Input, Select, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createPost, getPost, updatePost } from "../api/posts";
import type { PostPayload } from "../api/posts";

export function PostEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm<PostPayload>();
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!id) return;
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
  }, [id, form]);

  const onFinish = async (values: PostPayload) => {
    const payload = { ...values, content };
    const post = id ? await updatePost(Number(id), payload) : await createPost(payload);
    message.success("已保存");
    navigate(`/posts/${post.id}`);
  };

  return (
    <section>
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
    </section>
  );
}
