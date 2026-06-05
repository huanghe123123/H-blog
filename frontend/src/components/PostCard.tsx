import { Button, Card, Popconfirm, Space, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { Edit3, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { deletePost } from "../api/posts";
import { LikeButton } from "../components/LikeButton";
import { useAuth } from "../hooks/useAuth";
import type { Post, PostCategory } from "../types";

const CATEGORY_COLORS: Record<PostCategory, string> = {
  "技术": "geekblue",
  "创作": "purple",
  "生活": "green",
  "交流": "orange",
  "公告": "red",
};

interface PostCardProps {
  post: Post;
  coverOnTop?: boolean;
  showCover?: boolean;
  shadow?: boolean;
  showActions?: boolean;
  onDeleted?: () => void;
}

export function PostCard({ post, coverOnTop = false, showCover = true, shadow = true, showActions = false, onDeleted }: PostCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const searchByTag = (tag: string) => {
    navigate(`/posts/search?keyword=${encodeURIComponent(tag)}`);
  };

  const onDelete = async () => {
    await deletePost(post.id);
    message.success("文章已删除");
    onDeleted?.();
  };

  const cardContent = (
    <div className={coverOnTop ? "post-card-inner-vertical" : "post-card-inner"}>
      {showCover && post.cover_url && (
        <div className={coverOnTop ? "post-card-cover-top-img" : "post-card-cover"}>
          <img src={post.cover_url} alt={post.title} />
        </div>
      )}
      <div className={coverOnTop ? "post-card-body-top" : "post-card-body"}>
        <Typography.Title level={4} className="post-card-title">
          {post.status === "draft" && <Tag color="orange" style={{ marginRight: 6 }}>草稿</Tag>}
          <Tag color={CATEGORY_COLORS[post.category] || "default"} style={{ marginRight: 6 }}>{post.category}</Tag>
          {post.title}
        </Typography.Title>
        {post.summary && (
          <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} className="post-card-summary">
            {post.summary}
          </Typography.Paragraph>
        )}
        <div className="post-card-footer">
          <Typography.Text type="secondary" className="post-card-meta">
            <Link to={`/users/${post.author.id}`} onClick={(e) => e.stopPropagation()}>{post.author.nickname || post.author.username}</Link> · {dayjs(post.updated_at).format("YYYY-MM-DD HH:mm")} · {post.view_count} 次浏览 · {(post.comment_count ?? 0) + (post.reply_count ?? 0) > 0 && <>{post.comment_count ?? 0} 条评论{(post.reply_count ?? 0) > 0 && <> · {post.reply_count} 条回复</>}</>}
          </Typography.Text>
          {showActions && (
            <Space className="post-card-actions" onClick={(e) => e.stopPropagation()}>
              <LikeButton targetType="post" targetId={post.id} />
              {(user?.role === "admin" || user?.role === "owner") && (
                <>
                  <Button size="small" icon={<Edit3 size={14} />} onClick={() => navigate(`/posts/${post.id}/edit`)} />
                  <Popconfirm title="确认删除文章？" onConfirm={onDelete}>
                    <Button size="small" danger icon={<Trash2 size={14} />} />
                  </Popconfirm>
                </>
              )}
            </Space>
          )}
        </div>
        {post.tags && post.tags.length > 0 && (
          <Space size={4} wrap style={{ marginTop: 6 }}>
            {post.tags.map((tag) => (
              <Tag key={tag} color="blue" style={{ cursor: "pointer" }}
                onClick={(e) => { e.stopPropagation(); searchByTag(tag); }}>
                {tag}
              </Tag>
            ))}
          </Space>
        )}
      </div>
    </div>
  );

  return (
    <Card
      hoverable
      onClick={() => navigate(`/posts/${post.id}`)}
      className={`post-card${coverOnTop ? " post-card-cover-top" : ""}${!shadow ? " post-card-no-shadow" : ""}`}
    >
      {cardContent}
    </Card>
  );
}
