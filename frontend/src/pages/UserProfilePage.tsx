import { Avatar, Button, Card, DatePicker, Empty, Form, Input, Select, Space, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { Edit3, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listPosts } from "../api/posts";
import { getUserProfile, updateMe } from "../api/users";
import { useAuth } from "../hooks/useAuth";
import type { Post, UserProfile } from "../types";

const genderLabels: Record<string, string> = { male: "男", female: "女", other: "其他" };
const roleLabels: Record<string, string> = { admin: "管理员", moderator: "版主", user: "普通用户" };

function calcAge(birthday: string | null | undefined): number | null {
  if (!birthday) return null;
  const b = dayjs(birthday);
  const now = dayjs();
  let age = now.year() - b.year();
  if (now.month() < b.month() || (now.month() === b.month() && now.date() < b.date())) {
    age--;
  }
  return age;
}

export function UserProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me, refresh } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm();
  const userId = Number(id);
  const isOwn = me?.id === userId;

  useEffect(() => {
    if (isOwn && me) {
      setProfile({
        id: me.id,
        username: me.username,
        nickname: me.nickname,
        avatar_url: me.avatar_url,
        bio: me.bio,
        birthday: me.birthday,
        gender: me.gender,
        role: me.role,
        created_at: me.created_at,
      });
      form.setFieldsValue({
        ...me,
        birthday: me.birthday ? dayjs(me.birthday) : undefined,
      });
    } else {
      getUserProfile(userId).then(setProfile).catch(() => setProfile(null));
    }
  }, [userId, me, isOwn, form]);

  useEffect(() => {
    if (isOwn) {
      Promise.all([
        listPosts({ author_id: userId }),
        listPosts({ author_id: userId, status: "draft" }),
      ]).then(([published, drafts]) => {
        setPosts([...published, ...drafts].sort((a, b) => dayjs(b.updated_at).valueOf() - dayjs(a.updated_at).valueOf()));
      });
    } else {
      listPosts({ author_id: userId }).then(setPosts);
    }
  }, [userId, isOwn]);

  const onFinish = async (values: { nickname?: string; avatar_url?: string; bio?: string; birthday?: dayjs.Dayjs; gender?: string }) => {
    const payload: Record<string, unknown> = { ...values };
    if (values.birthday) {
      payload.birthday = values.birthday.format("YYYY-MM-DD");
    }
    await updateMe(payload as Record<string, string>);
    await refresh();
    setEditing(false);
    message.success("资料已更新");
  };

  if (!profile) return null;

  const age = calcAge(profile.birthday);

  return (
    <section>
      {editing ? (
        <>
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
            <Space>
              <Button type="primary" htmlType="submit">保存资料</Button>
              <Button onClick={() => setEditing(false)}>取消</Button>
            </Space>
          </Form>
        </>
      ) : (
        <>
          <Card>
            <Space align="start" size={20}>
              <Avatar size={80} src={profile.avatar_url} icon={<UserRound />} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Typography.Title level={3} style={{ margin: 0 }}>
                    {profile.nickname || profile.username}
                  </Typography.Title>
                  <Tag color={profile.role === "admin" ? "red" : profile.role === "moderator" ? "blue" : "default"}>
                    {roleLabels[profile.role] || profile.role}
                  </Tag>
                  {isOwn && <Button type="text" size="small" icon={<Edit3 size={14} />} onClick={() => setEditing(true)} />}
                </div>
                <Typography.Text type="secondary">
                  {profile.nickname ? `@${profile.username} · ` : ""}{dayjs(profile.created_at).format("YYYY-MM-DD")} 加入
                </Typography.Text>
                {profile.bio && <Typography.Paragraph style={{ marginTop: 12 }}>{profile.bio}</Typography.Paragraph>}
                {(profile.gender || age !== null) && (
                  <div style={{ marginTop: 4 }}>
                    {profile.gender && (
                      <Typography.Text type="secondary">{genderLabels[profile.gender] || profile.gender}</Typography.Text>
                    )}
                    {profile.gender && age !== null && (
                      <Typography.Text type="secondary"> · </Typography.Text>
                    )}
                    {age !== null && (
                      <Typography.Text type="secondary">{age} 岁</Typography.Text>
                    )}
                  </div>
                )}
              </div>
            </Space>
          </Card>
        </>
      )}

      <Typography.Title level={4} style={{ marginTop: 24 }}>{isOwn ? "我的文章" : "Ta 的文章"}</Typography.Title>
      {posts.length === 0 ? (
        <Empty description="暂无文章" />
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {posts.map((post) => (
            <Card
              key={post.id}
              hoverable
              onClick={() => navigate(`/posts/${post.id}`)}
              className="post-card"
            >
              <div className="post-card-inner">
                {post.cover_url && (
                  <div className="post-card-cover">
                    <img src={post.cover_url} alt={post.title} />
                  </div>
                )}
                <div className="post-card-body">
                  <Typography.Title level={4} className="post-card-title" ellipsis={{ rows: 1 }}>
                    {post.status === "draft" && <Tag color="orange" style={{ marginRight: 8 }}>草稿</Tag>}
                    {post.title}
                  </Typography.Title>
                  {post.summary && (
                    <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} className="post-card-summary">
                      {post.summary}
                    </Typography.Paragraph>
                  )}
                  <div className="post-card-footer">
                    <Typography.Text type="secondary" className="post-card-meta">
                      {dayjs(post.updated_at).format("YYYY-MM-DD HH:mm")} · {post.view_count} 次浏览
                    </Typography.Text>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </Space>
      )}
    </section>
  );
}
