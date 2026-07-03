import { Badge, Button, Card, DatePicker, Empty, Form, Input, Popconfirm, Select, Space, Typography, message } from "antd";
import dayjs from "dayjs";
import { Edit3, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createProfileComment, deleteProfileComment, listProfileComments } from "../api/comments";
import { listPosts } from "../api/posts";
import { getUserProfile, updateMe, updatePassword } from "../api/users";
import { BioEditor } from "../components/BioEditor";
import { CommentEditor } from "../components/CommentEditor";
import { LikeButton } from "../components/LikeButton";
import { LinkEditorModal } from "../components/LinkEditorModal";
import { PostCard } from "../components/PostCard";
import { ProfileSideCard } from "../components/ProfileSideCard";
import { useAuth } from "../hooks/useAuth";
import type { Comment, Post, UserLink, UserProfile } from "../types";
import { sanitizeHtml } from "../utils";
import { resolveAcfunEmojiHtml } from "../utils/acfun";

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
  const [bioContent, setBioContent] = useState("");
  const [editLinks, setEditLinks] = useState<UserLink[]>([]);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editingLinkIdx, setEditingLinkIdx] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
        links: me.links,
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

  const onFinish = async (values: { nickname?: string; avatar_url?: string; birthday?: dayjs.Dayjs; gender?: string }) => {
    const payload: Record<string, unknown> = { ...values, bio: bioContent };
    if (values.birthday) {
      payload.birthday = values.birthday.format("YYYY-MM-DD");
    }
    payload.links = editLinks.length > 0 ? editLinks : null;
    await updateMe(payload as Record<string, string>);

    if (newPassword) {
      if (newPassword !== confirmPassword) {
        message.error("两次输入的密码不一致");
        return;
      }
      await updatePassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      message.success("资料和密码已更新");
    } else {
      message.success("资料已更新");
    }

    await refresh();
    setEditing(false);
  };

  const yearGroups = useMemo(() => groupByYear(posts), [posts]);
  const years = useMemo(() => [...yearGroups.keys()].sort((a, b) => b - a), [yearGroups]);
  const recentPosts = useMemo(() => posts.filter(p => p.status !== "draft").slice(0, 5), [posts]);

  if (!profile) return null;

  const age = calcAge(profile.birthday);
  const publishedCount = posts.filter(p => p.status !== "draft").length;

  const startEdit = () => {
    setEditLinks(profile.links ? [...profile.links] : []);
    setBioContent(profile.bio || "");
    setEditing(true);
  };

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
          <Form.Item label="个人简介">
            <BioEditor value={bioContent} onChange={setBioContent} />
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
          <Typography.Title level={5} style={{ marginBottom: 12 }}>修改密码</Typography.Title>
          <Form.Item label="新密码">
            <Input.Password
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="留空则不修改密码"
              minLength={8}
              maxLength={128}
            />
          </Form.Item>
          <Form.Item label="确认新密码">
            <Input.Password
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入新密码"
              minLength={8}
              maxLength={128}
            />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">保存资料</Button>
            <Button onClick={() => setEditing(false)}>取消</Button>
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

  return (
    <div className="profile-layout">
      <ProfileSideCard
        profile={profile}
        publishedCount={publishedCount}
        yearsCount={years.length}
        age={age}
        isOwn={isOwn}
        onEdit={startEdit}
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
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="profile-right-col">
        <Card title="最近文章" className="side-card" style={{ borderRadius: 0 }}>
          {recentPosts.length === 0 ? (
            <Empty description="暂无" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {recentPosts.map((post) => (
                <PostCard key={post.id} post={post} showCover={false} shadow={false} />
              ))}
            </div>
          )}
        </Card>

        <Card title="归档" className="side-card" style={{ borderRadius: 0 }}>
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

        <Card title="留言" className="side-card" style={{ borderRadius: 0 }}>
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
                        {(me?.id === c.user_id || me?.role === "admin" || me?.role === "owner") && (
                          <Popconfirm title="确认删除？" onConfirm={async () => { await deleteProfileComment(c.id); await refreshPComments(); }}>
                            <Button type="text" danger size="small" icon={<Trash2 size={12} />} />
                          </Popconfirm>
                        )}
                      </Space>
                    }
                  >
                    <div className="comment-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(resolveAcfunEmojiHtml(c.content)) }} />
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
                              {(me?.id === reply.user_id || me?.role === "admin" || me?.role === "owner") && (
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
                          <div className="comment-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(resolveAcfunEmojiHtml(reply.content)) }} />
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
