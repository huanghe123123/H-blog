import { Avatar, Card, Empty, Space, Typography } from "antd";
import dayjs from "dayjs";
import { UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listPosts } from "../api/posts";
import { getUserProfile } from "../api/users";
import type { Post, UserProfile } from "../types";

export function UserProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const userId = Number(id);

  useEffect(() => {
    getUserProfile(userId).then(setProfile).catch(() => setProfile(null));
    listPosts({ author_id: userId }).then(setPosts);
  }, [userId]);

  if (!profile) return null;

  return (
    <section>
      <Card>
        <Space align="start" size={20}>
          <Avatar size={80} src={profile.avatar_url} icon={<UserRound />} />
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {profile.nickname || profile.username}
            </Typography.Title>
            <Typography.Text type="secondary">
              {profile.nickname ? `@${profile.username} · ` : ""}{dayjs(profile.created_at).format("YYYY-MM-DD")} 加入
            </Typography.Text>
            {profile.bio && <Typography.Paragraph style={{ marginTop: 12 }}>{profile.bio}</Typography.Paragraph>}
          </div>
        </Space>
      </Card>

      <Typography.Title level={4} style={{ marginTop: 24 }}>Ta 的文章</Typography.Title>
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
