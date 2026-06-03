import { Button, Card, Empty, Input, Popconfirm, Space, Typography, message } from "antd";
import dayjs from "dayjs";
import { Edit3, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deletePost, listPosts } from "../api/posts";
import { useAuth } from "../hooks/useAuth";
import type { Post } from "../types";

export function PostListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [keyword, setKeyword] = useState("");

  const load = async () => setPosts(await listPosts({ keyword: keyword || undefined }));

  useEffect(() => {
    void load();
  }, []);

  const onDeletePost = async (id: number) => {
    await deletePost(id);
    message.success("文章已删除");
    await load();
  };

  return (
    <section>
      <div className="page-title-row">
        <Typography.Title level={2}>文章</Typography.Title>
        {user && <Button type="primary" onClick={() => navigate("/posts/new")}>新建文章</Button>}
      </div>
      <Space className="toolbar" wrap>
        <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} prefix={<Search size={16} />} placeholder="搜索标题、摘要、内容" onPressEnter={load} />
        <Button onClick={load}>搜索</Button>
      </Space>
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
                    {post.title}
                  </Typography.Title>
                  {post.summary && (
                    <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} className="post-card-summary">
                      {post.summary}
                    </Typography.Paragraph>
                  )}
                  <div className="post-card-footer">
                    <Typography.Text type="secondary" className="post-card-meta">
                      {post.author.nickname || post.author.username} · {dayjs(post.updated_at).format("YYYY-MM-DD HH:mm")} · {post.view_count} 次浏览
                    </Typography.Text>
                    {user?.role === "admin" && (
                      <Space className="post-card-actions" onClick={(e) => e.stopPropagation()}>
                        <Button size="small" icon={<Edit3 size={14} />} onClick={() => navigate(`/posts/${post.id}/edit`)} />
                        <Popconfirm title="确认删除文章？" onConfirm={() => onDeletePost(post.id)}>
                          <Button size="small" danger icon={<Trash2 size={14} />} />
                        </Popconfirm>
                      </Space>
                    )}
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
