import { Button, Form, Input, Typography, message } from "antd";
import { useEffect } from "react";
import { updateMe } from "../api/users";
import { useAuth } from "../hooks/useAuth";

export function ProfilePage() {
  const { user, refresh } = useAuth();
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue(user);
  }, [user, form]);

  const onFinish = async (values: { nickname?: string; avatar_url?: string; bio?: string }) => {
    await updateMe(values);
    await refresh();
    message.success("资料已更新");
  };

  return (
    <section>
      <Typography.Title level={2}>个人资料</Typography.Title>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item label="昵称" name="nickname">
          <Input maxLength={80} />
        </Form.Item>
        <Form.Item label="头像 URL" name="avatar_url">
          <Input maxLength={500} />
        </Form.Item>
        <Form.Item label="个人简介" name="bio">
          <Input.TextArea rows={5} maxLength={2000} />
        </Form.Item>
        <Button type="primary" htmlType="submit">保存资料</Button>
      </Form>
    </section>
  );
}
