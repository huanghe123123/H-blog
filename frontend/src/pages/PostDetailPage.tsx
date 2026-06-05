import MDEditor from "@uiw/react-md-editor";
import { Button, Card, Divider, Popconfirm, Space, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { Edit3, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createComment, deleteComment, listComments } from "../api/comments";
import { deletePost, getPost, listPosts } from "../api/posts";
import { getUserProfile } from "../api/users";
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

export function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{
    parentId: number;
    replyToUserId: number;
    username: string;
    replyPreview: string | null;
  } | null>(null);
  const [authorProfile, setAuthorProfile] = useState<UserProfile | null>(null);
  const [authorPosts, setAuthorPosts] = useState<Post[]>([]);
  const postId = Number(id);
  const loadedId = useRef<number | null>(null);

  const load = async () => {
    const p = await getPost(postId);
    setPost(p);
    setComments(await listComments(postId));
    getUserProfile(p.author_id).then(setAuthorProfile).catch(() => setAuthorProfile(null));
    listPosts({ author_id: p.author_id }).then(setAuthorPosts);
  };

  const refreshComments = async () => {
    setComments(await listComments(postId));
  };

  useEffect(() => {
    if (loadedId.current === postId) return;
    loadedId.current = postId;
    void load();
  }, [postId]);

  const publishedCount = useMemo(
    () => authorPosts.filter(p => p.status !== "draft").length,
    [authorPosts],
  );
  const yearsCount = useMemo(
    () => new Set(authorPosts.map(p => dayjs(p.created_at).year())).size,
    [authorPosts],
  );
  const authorAge = useMemo(() => calcAge(authorProfile?.birthday), [authorProfile]);
  const recentAuthorPosts = useMemo(
    () => authorPosts.filter(p => p.status !== "draft").slice(0, 5),
    [authorPosts],
  );

  if (!post) return null;
  const isAuthor = user?.id === post.author_id;

  const onDeletePost = async () => {
    await deletePost(post.id);
    message.success("文章已删除");
    navigate(-1);
  };

  const onComment = async () => {
    if (!stripHtml(commentContent)) {
      message.warning("请输入评论");
      return;
    }
    setSubmitting(true);
    try {
      await createComment(
        post.id,
        commentContent,
        replyTo?.parentId,
        replyTo?.replyToUserId,
        replyTo?.replyPreview ?? undefined,
      );
      setCommentContent("");
      setReplyTo(null);
      await refreshComments();
    } finally {
      setSubmitting(false);
    }
  };

  const onReply = (parentId: number, replyToUserId: number, username: string, replyContent: string) => {
    setReplyTo({ parentId, replyToUserId, username, replyPreview: previewText(replyContent) });
    setCommentContent("");
  };

  const onCancelReply = () => {
    setReplyTo(null);
    setCommentContent("");
  };

  return (
    <div className="post-detail-layout">
      {authorProfile && (
        <ProfileSideCard
          profile={authorProfile}
          publishedCount={publishedCount}
          yearsCount={yearsCount}
          age={authorAge}
          isOwn={false}
        />
      )}
      <article className="post-detail">
      <div className="page-title-row">
        <div>
          <Typography.Title level={1}>{post.title}</Typography.Title>
          <Typography.Text type="secondary">
            <Link to={`/users/${post.author.id}`}>{post.author.nickname || post.author.username}</Link> · {dayjs(post.updated_at).format("YYYY-MM-DD HH:mm")} · {post.view_count} 次浏览
          </Typography.Text>
          {post.tags && post.tags.length > 0 && (
            <Space size={4} wrap style={{ marginTop: 8 }}>
              {post.tags.map((tag) => (
                <Tag key={tag} color="blue" style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/?keyword=${encodeURIComponent(tag)}`)}>
                  {tag}
                </Tag>
              ))}
            </Space>
          )}
        </div>
        <Space>
          <LikeButton targetType="post" targetId={post.id} />
          {(isAuthor || user?.role === "admin" || user?.role === "owner") && (
            <>
              <Button icon={<Edit3 size={16} />} onClick={() => navigate(`/posts/${post.id}/edit`)}>编辑</Button>
              <Popconfirm title="确认删除文章？" onConfirm={onDeletePost}>
                <Button danger icon={<Trash2 size={16} />} />
              </Popconfirm>
            </>
          )}
        </Space>
      </div>
      {post.cover_url && <img className="cover" src={post.cover_url} alt={post.title} />}
      <Typography.Paragraph className="summary">{post.summary}</Typography.Paragraph>
      <div data-color-mode="light" className="markdown-body">
        <MDEditor.Markdown source={post.content} />
      </div>
      <Divider />
      <Typography.Title level={3}>
        评论
        {comments.length > 0 && (
          <Typography.Text type="secondary" style={{ fontSize: 14, fontWeight: 400, marginLeft: 8 }}>
            {comments.length} 条评论
            {comments.reduce((sum, c) => sum + c.replies.length, 0) > 0 &&
              <> · {comments.reduce((sum, c) => sum + c.replies.length, 0)} 条回复</>
            }
          </Typography.Text>
        )}
      </Typography.Title>
      {user ? (
        <div style={{ marginBottom: 20 }}>
          {replyTo ? (
            <Card
              size="small"
              className="reply-editor-card"
              title={<span>回复 <Link to={`/users/${replyTo.replyToUserId}`} style={{ fontWeight: 600 }}>@{replyTo.username}</Link></span>}
              extra={<Button type="text" size="small" onClick={onCancelReply}>取消回复</Button>}
            >
              <CommentEditor
                key={replyTo.replyToUserId}
                value={commentContent}
                onChange={setCommentContent}
                placeholder={`回复 @${replyTo.username}...`}
                autoFocus
              />
              <Button type="primary" onClick={onComment} loading={submitting} style={{ marginTop: 12 }}>
                回复
              </Button>
            </Card>
          ) : (
            <>
              <CommentEditor value={commentContent} onChange={setCommentContent} />
              <Button type="primary" onClick={onComment} loading={submitting} style={{ marginTop: 12 }}>
                发布评论
              </Button>
            </>
          )}
        </div>
      ) : (
        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 20 }}>
          <Link to="/login">登录</Link>后即可评论
        </Typography.Text>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {comments.map((comment) => (
          <div key={comment.id}>
            <Card
              className="comment-card"
              size="small"
              title={
                <span>
                  <Link to={`/users/${comment.user.id}`}>{comment.user.nickname || comment.user.username}</Link>
                  <span style={{ color: "#8b949e", marginLeft: 8, fontSize: 13, fontWeight: 400 }}>
                    {dayjs(comment.created_at).format("YYYY-MM-DD HH:mm")}
                  </span>
                </span>
              }
              extra={
                <Space size={4}>
                  <LikeButton targetType="comment" targetId={comment.id} />
                  {user && (
                    <Button
                      type="text"
                      size="small"
                      onClick={() => onReply(comment.id, comment.user.id, comment.user.nickname || comment.user.username, comment.content)}
                    >
                      回复
                    </Button>
                  )}
                  {(user?.id === comment.user_id || user?.role === "admin" || user?.role === "owner") && (
                    <Popconfirm title="确认删除评论？" onConfirm={async () => { await deleteComment(comment.id); await refreshComments(); }}>
                      <Button danger size="small" icon={<Trash2 size={14} />} />
                    </Popconfirm>
                  )}
                </Space>
              }
            >
              <div className="comment-content" dangerouslySetInnerHTML={{ __html: comment.content }} />
            </Card>
            {comment.replies.length > 0 && (
              <div className="comment-replies">
                {comment.replies.map((reply) => (
                  <Card
                    key={reply.id}
                    className="comment-card"
                    size="small"
                    title={
                      <span>
                        <Link to={`/users/${reply.user.id}`}>{reply.user.nickname || reply.user.username}</Link>
                        <span style={{ color: "#8b949e", marginLeft: 8, fontSize: 13, fontWeight: 400 }}>
                          {dayjs(reply.created_at).format("YYYY-MM-DD HH:mm")}
                        </span>
                      </span>
                    }
                    extra={
                      <Space size={4}>
                        <LikeButton targetType="comment" targetId={reply.id} />
                        {user && (
                          <Button
                            type="text"
                            size="small"
                            onClick={() => onReply(comment.id, reply.user.id, reply.user.nickname || reply.user.username, reply.content)}
                          >
                            回复
                          </Button>
                        )}
                        {(user?.id === reply.user_id || user?.role === "admin" || user?.role === "owner") && (
                          <Popconfirm title="确认删除评论？" onConfirm={async () => { await deleteComment(reply.id); await refreshComments(); }}>
                            <Button danger size="small" icon={<Trash2 size={14} />} />
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
    </article>
      {authorProfile && (
        <div className="post-detail-right">
          <Card title="最近文章" className="side-card">
            {recentAuthorPosts.length === 0 ? (
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>暂无</Typography.Text>
            ) : (
              recentAuthorPosts.map(p => (
                <div key={p.id} style={{ marginBottom: 8 }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(p.created_at).format("YYYY-MM-DD")}
                  </Typography.Text>
                  <div>
                    <Link to={`/posts/${p.id}`} style={{ fontSize: 14 }}>{p.title}</Link>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
