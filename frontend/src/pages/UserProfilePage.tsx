import { Avatar, Badge, Button, Card, DatePicker, Empty, Form, Input, Select, Space, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { Edit3, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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

function groupByYear(posts: Post[]): Map<number, Post[]> {
  const map = new Map<number, Post[]>();
  for (const post of posts) {
    const year = dayjs(post.created_at).year();
    if (!map.has(year)) map.set(year, []);
    map.get(year)!.push(post);
  }
  return map;
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
        setPosts([...published, ...drafts].sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf()));
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

  const yearGroups = useMemo(() => groupByYear(posts), [posts]);
  const years = useMemo(() => [...yearGroups.keys()].sort((a, b) => b - a), [yearGroups]);
  const recentPosts = useMemo(() => posts.filter(p => p.status !== "draft").slice(0, 5), [posts]);

  if (!profile) return null;

  const age = calcAge(profile.birthday);
  const publishedCount = posts.filter(p => p.status !== "draft").length;

  if (editing) {
    return (
      <section style={{ maxWidth: 720, margin: "0 auto" }}>
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
      </section>
    );
  }

  return (
    <div className="profile-layout">
      <Card className="side-card profile-left-card">
        <div className="side-profile">
          <Avatar size={80} src={profile.avatar_url} icon={<UserRound />} />
          <Typography.Title level={4} style={{ margin: "12px 0 4px" }}>
            {profile.nickname || profile.username}
          </Typography.Title>
          <Tag color={profile.role === "admin" ? "red" : profile.role === "moderator" ? "blue" : "default"}>
            {roleLabels[profile.role] || profile.role}
          </Tag>
          {profile.bio && (
            <Typography.Paragraph type="secondary" style={{ marginTop: 10, textAlign: "center", fontSize: 14 }}>
              {profile.bio}
            </Typography.Paragraph>
          )}
          {isOwn && (
            <Button type="text" size="small" icon={<Edit3 size={14} />} onClick={() => setEditing(true)} style={{ marginTop: 8 }}>
              编辑资料
            </Button>
          )}
          <div className="side-stats">
            <div className="side-stat">
              <span className="side-stat-num">{publishedCount}</span>
              <span className="side-stat-label">文章</span>
            </div>
            <div className="side-stat">
              <span className="side-stat-num">{years.length}</span>
              <span className="side-stat-label">年份</span>
            </div>
            <div className="side-stat">
              <span className="side-stat-num">{age ?? "-"}</span>
              <span className="side-stat-label">岁</span>
            </div>
            <div className="side-stat">
              <span className="side-stat-num">{profile.gender ? (genderLabels[profile.gender] ?? profile.gender) : "-"}</span>
              <span className="side-stat-label">性别</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="profile-center">
        {posts.length === 0 ? (
          <Empty description="暂无文章" style={{ marginTop: 60 }} />
        ) : (
          years.map((year) => (
            <div key={year} className="year-section" id={`year-${year}`}>
              <Typography.Title level={2} className="year-heading">{year}</Typography.Title>
              <div className="year-posts">
                {yearGroups.get(year)!.map((post) => (
                  <Card
                    key={post.id}
                    hoverable
                    className="archive-post-card"
                    onClick={() => navigate(`/posts/${post.id}`)}
                  >
                    <div className="archive-post-inner">
                      <div className="archive-post-text">
                        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                          {dayjs(post.created_at).format("YYYY-MM-DD")}
                        </Typography.Text>
                        <Typography.Title level={5} style={{ margin: "4px 0 0" }}>
                          {post.status === "draft" && <Tag color="orange" style={{ marginRight: 6 }}>草稿</Tag>}
                          {post.title}
                        </Typography.Title>
                      </div>
                      {post.cover_url && (
                        <div className="archive-post-cover">
                          <img src={post.cover_url} alt={post.title} />
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="profile-right-col">
        <Card title="最近文章" className="side-card">
          {recentPosts.length === 0 ? (
            <Empty description="暂无" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            recentPosts.map((post) => (
              <div key={post.id} className="side-recent-item">
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(post.created_at).format("YYYY-MM-DD")}
                </Typography.Text>
                <div>
                  <Link to={`/posts/${post.id}`} className="side-recent-link">
                    {post.title}
                  </Link>
                </div>
              </div>
            ))
          )}
        </Card>

        <Card title="归档" className="side-card">
          {years.length === 0 ? (
            <Empty description="暂无" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            years.map((year) => (
              <div
                key={year}
                className="side-archive-row side-archive-clickable"
                onClick={() => {
                  const el = document.getElementById(`year-${year}`);
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <span>{year}</span>
                <Badge count={yearGroups.get(year)!.length} overflowCount={999} style={{ backgroundColor: "#d8dee4", color: "#57606a" }} />
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}
