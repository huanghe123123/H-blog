import MDEditor from "@uiw/react-md-editor";
import { Button, Card, Divider, Pagination, Popconfirm, Space, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { Edit3, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createComment, deleteComment, listComments } from "../api/comments";
import { deletePost, getPost } from "../api/posts";
import { CommentEditor } from "../components/CommentEditor";
import { LikeButton } from "../components/LikeButton";
import { useAuth } from "../hooks/useAuth";
import type { Comment, Post } from "../types";

export function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const postId = Number(id);
  const loadedId = useRef<number | null>(null);

  const load = async () => {
    setPost(await getPost(postId));
    setComments(await listComments(postId));
  };

  const refreshComments = async () => {
    setComments(await listComments(postId));
  };

  useEffect(() => {
    if (loadedId.current === postId) return;
    loadedId.current = postId;
    void load();
  }, [postId]);

  if (!post) return null;
  const isAuthor = user?.id === post.author_id;

  const onDeletePost = async () => {
    await deletePost(post.id);
    message.success("文章已删除");
    navigate("/");
  };

  const onComment = async () => {
    const html = commentContent.trim();
    if (!html) {
      message.warning("请输入评论");
      return;
    }
    setSubmitting(true);
    try {
      await createComment(post.id, html);
      setCommentContent("");
      await refreshComments();
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
          {(isAuthor || user?.role === "admin") && (
            <>
              <Button icon={<Edit3 size={16} />}><Link to={`/posts/${post.id}/edit`}>编辑</Link></Button>
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
      <Typography.Title level={3}>评论</Typography.Title>
      {user ? (
        <>
          <CommentEditor value={commentContent} onChange={setCommentContent} />
          <Button type="primary" onClick={onComment} loading={submitting} style={{ marginTop: 12 }}>
            发布评论
          </Button>
        </>
      ) : (
        <Typography.Text type="secondary">
          <Link to="/login">登录</Link>后即可评论
        </Typography.Text>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {comments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((comment) => (
          <Card
            key={comment.id}
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
                {(user?.id === comment.user_id || user?.role === "admin") && (
                  <Popconfirm title="确认删除评论？" onConfirm={async () => { await deleteComment(comment.id); await refreshComments(); }}>
                    <Button danger size="small" icon={<Trash2 size={14} />} />
                  </Popconfirm>
                )}
              </Space>
            }
          >
            <div className="comment-content" dangerouslySetInnerHTML={{ __html: comment.content }} />
          </Card>
        ))}
      </div>
      {comments.length > PAGE_SIZE && (
        <Pagination
          current={page}
          pageSize={PAGE_SIZE}
          total={comments.length}
          onChange={setPage}
          style={{ marginTop: 20, textAlign: "center" }}
        />
      )}
    </article>
  );
}
