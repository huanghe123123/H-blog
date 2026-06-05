import { Badge, Button, Card, DatePicker, Empty, Form, Input, Popconfirm, Select, Space, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { Edit3, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createProfileComment, deleteProfileComment, listProfileComments } from "../api/comments";
import { listPosts } from "../api/posts";
import { getUserProfile, updateMe } from "../api/users";
import { CommentEditor } from "../components/CommentEditor";
import { LikeButton } from "../components/LikeButton";
import { ProfileSideCard } from "../components/ProfileSideCard";
import { useAuth } from "../hooks/useAuth";
import type { Comment, Post, UserProfile } from "../types";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function previewText(html: string, maxLen: number = 10): string | null {
  const text = stripHtml(html);
  if (!text) return null;
  return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
}

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
  const [pcomments, setPComments] = useState<Comment[]>([]);
  const [pcommentContent, setPCommentContent] = useState("");
  const [pcommentSubmitting, setPCommentSubmitting] = useState(false);
  const [pReplyTo, setPReplyTo] = useState<{
    parentId: number;
    replyToUserId: number;
    username: string;
    replyPreview: string | null;
  } | null>(null);
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

  useEffect(() => {
    listProfileComments(userId).then(setPComments);
  }, [userId]);

  const refreshPComments = async () => {
    setPComments(await listProfileComments(userId));
  };

  const onPComment = async () => {
    if (!stripHtml(pcommentContent)) {
      message.warning("请输入留言");
      return;
    }
    setPCommentSubmitting(true);
    try {
      await createProfileComment(
        userId,
        pcommentContent,
        pReplyTo?.parentId,
        pReplyTo?.replyToUserId,
        pReplyTo?.replyPreview ?? undefined,
      );
      setPCommentContent("");
      setPReplyTo(null);
      await refreshPComments();
    } finally {
      setPCommentSubmitting(false);
    }
  };

  const onPReply = (parentId: number, replyToUserId: number, username: string, replyContent: string) => {
    setPReplyTo({ parentId, replyToUserId, username, replyPreview: previewText(replyContent) });
    setPCommentContent("");
  };

  const onPCancelReply = () => {
    setPReplyTo(null);
    setPCommentContent("");
  };

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
      <ProfileSideCard
        profile={profile}
        publishedCount={publishedCount}
        yearsCount={years.length}
        age={age}
        isOwn={isOwn}
        onEdit={() => setEditing(true)}
      />

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
                <Badge count={yearGroups.get(year)!.length} overflowCount={999} style={{ backgroundColor: "var(--border)", color: "var(--text-secondary)" }} />
              </div>
            ))
          )}
        </Card>

        <Card title="留言" className="side-card">
          {me ? (
            <div style={{ marginBottom: 12 }}>
              {pReplyTo ? (
                <Card
                  size="small"
                  className="reply-editor-card"
                  title={<span>回复 <Link to={`/users/${pReplyTo.replyToUserId}`} style={{ fontWeight: 600 }}>@{pReplyTo.username}</Link></span>}
                  extra={<Button type="text" size="small" onClick={onPCancelReply}>取消回复</Button>}
                >
                  <CommentEditor
                    key={pReplyTo.replyToUserId}
                    value={pcommentContent}
                    onChange={setPCommentContent}
                    placeholder={`回复 @${pReplyTo.username}...`}
                    autoFocus
                  />
                  <Button type="primary" size="small" onClick={onPComment} loading={pcommentSubmitting} style={{ marginTop: 8 }}>
                    回复
                  </Button>
                </Card>
              ) : (
                <>
                  <CommentEditor
                    key="profile-comment"
                    value={pcommentContent}
                    onChange={setPCommentContent}
                    placeholder="写下你的留言..."
                  />
                  <Button type="primary" size="small" onClick={onPComment} loading={pcommentSubmitting} style={{ marginTop: 8 }}>
                    留言
                  </Button>
                </>
              )}
            </div>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 12 }}>
              <Link to="/login">登录</Link>后即可留言
            </Typography.Text>
          )}
          {pcomments.length === 0 ? (
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>暂无留言</Typography.Text>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pcomments.map((c) => (
                <div key={c.id}>
                  <Card
                    className="comment-card"
                    size="small"
                    title={
                      <span style={{ fontSize: 13 }}>
                        <Link to={`/users/${c.user.id}`}>{c.user.nickname || c.user.username}</Link>
                        <span style={{ color: "#8b949e", marginLeft: 6, fontSize: 12, fontWeight: 400 }}>
                          {dayjs(c.created_at).format("MM-DD HH:mm")}
                        </span>
                      </span>
                    }
                    extra={
                      <Space size={2}>
                        <LikeButton targetType="comment" targetId={c.id} />
                        {me && (
                          <Button type="text" size="small" style={{ fontSize: 12 }}
                            onClick={() => onPReply(c.id, c.user.id, c.user.nickname || c.user.username, c.content)}>
                            回复
                          </Button>
                        )}
                        {(me?.id === c.user_id || me?.role === "admin") && (
                          <Popconfirm title="确认删除？" onConfirm={async () => { await deleteProfileComment(c.id); await refreshPComments(); }}>
                            <Button type="text" danger size="small" icon={<Trash2 size={12} />} />
                          </Popconfirm>
                        )}
                      </Space>
                    }
                  >
                    <div className="comment-content" dangerouslySetInnerHTML={{ __html: c.content }} />
                  </Card>
                  {c.replies.length > 0 && (
                    <div className="comment-replies">
                      {c.replies.map((reply) => (
                        <Card
                          key={reply.id}
                          className="comment-card"
                          size="small"
                          title={
                            <span style={{ fontSize: 13 }}>
                              <Link to={`/users/${reply.user.id}`}>{reply.user.nickname || reply.user.username}</Link>
                              <span style={{ color: "#8b949e", marginLeft: 6, fontSize: 12, fontWeight: 400 }}>
                                {dayjs(reply.created_at).format("MM-DD HH:mm")}
                              </span>
                            </span>
                          }
                          extra={
                            <Space size={2}>
                              <LikeButton targetType="comment" targetId={reply.id} />
                              {me && (
                                <Button type="text" size="small" style={{ fontSize: 12 }}
                                  onClick={() => onPReply(c.id, reply.user.id, reply.user.nickname || reply.user.username, reply.content)}>
                                  回复
                                </Button>
                              )}
                              {(me?.id === reply.user_id || me?.role === "admin") && (
                                <Popconfirm title="确认删除？" onConfirm={async () => { await deleteProfileComment(reply.id); await refreshPComments(); }}>
                                  <Button type="text" danger size="small" icon={<Trash2 size={12} />} />
                                </Popconfirm>
                              )}
                            </Space>
                          }
                        >
                          {reply.reply_to_user && (
                            <div className="reply-to-tag">
                              回复 <Link to={`/users/${reply.reply_to_user.id}`}>@{reply.reply_to_user.nickname || reply.reply_to_user.username}</Link>
                              {reply.reply_preview && <>：&ldquo;{reply.reply_preview}&rdquo;</>}
                            </div>
                          )}
                          <div className="comment-content" dangerouslySetInnerHTML={{ __html: reply.content }} />
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
