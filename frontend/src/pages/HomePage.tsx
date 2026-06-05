import { Card, Empty, Tag, Typography } from "antd";
import MDEditor from "@uiw/react-md-editor";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchSiteConfig } from "../api/config";
import { listPosts } from "../api/posts";
import { getSiteOwner } from "../api/users";
import { ProfileSideCard } from "../components/ProfileSideCard";
import type { Post, UserProfile } from "../types";

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

export function HomePage() {
  const navigate = useNavigate();
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [siteName, setSiteName] = useState("");
  const [siteDesc, setSiteDesc] = useState("");
  const [nameColor, setNameColor] = useState("#1f2d3d");
  const [descColor, setDescColor] = useState("#6c757e");
  const [hotPosts, setHotPosts] = useState<Post[]>([]);
  const [ownerPosts, setOwnerPosts] = useState<Post[]>([]);

  useEffect(() => {
    fetchSiteConfig().then((cfg) => {
      setSiteName(cfg.site_name);
      setSiteDesc(cfg.site_description);
      setNameColor(cfg.site_name_color);
      setDescColor(cfg.site_description_color);
    });
    getSiteOwner().then(setOwner).catch(() => setOwner(null));
    listPosts({ sort_by: "score", limit: 10 }).then(setHotPosts);
  }, []);

  useEffect(() => {
    if (owner) {
      listPosts({ author_id: owner.id }).then(setOwnerPosts);
    }
  }, [owner]);

  const publishedCount = useMemo(
    () => ownerPosts.filter(p => p.status !== "draft").length,
    [ownerPosts],
  );
  const yearsCount = useMemo(
    () => new Set(ownerPosts.map(p => dayjs(p.created_at).year())).size,
    [ownerPosts],
  );
  const recentPosts = useMemo(() => ownerPosts.filter(p => p.status !== "draft").slice(0, 5), [ownerPosts]);
  const age = useMemo(() => calcAge(owner?.birthday), [owner]);

  const searchByTag = (tag: string) => {
    navigate(`/posts/search?keyword=${encodeURIComponent(tag)}`);
  };

  return (
    <div className="profile-layout">
      {owner && (
        <ProfileSideCard
          profile={owner}
          publishedCount={publishedCount}
          yearsCount={yearsCount}
          age={age}
          isOwn={false}
        />
      )}
      <div className="profile-center">
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Typography.Title level={2} style={{ marginBottom: 8, color: nameColor }}>{siteName}</Typography.Title>
          {siteDesc && (
            <div data-color-mode="light" className="site-desc" style={{ display: "inline-block", textAlign: "left", ["--desc-color" as string]: descColor }}>
              <MDEditor.Markdown source={siteDesc} />
            </div>
          )}
        </div>
        <Typography.Title level={4} style={{ marginBottom: 16 }}>热门文章</Typography.Title>
        {hotPosts.length === 0 ? (
          <Empty description="暂无文章" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {hotPosts.map((post) => (
              <Card
                key={post.id}
                hoverable
                onClick={() => navigate(`/posts/${post.id}`)}
                className="post-card post-card-cover-top"
              >
                <div className="post-card-inner-vertical">
                  {post.cover_url && (
                    <div className="post-card-cover-top-img">
                      <img src={post.cover_url} alt={post.title} />
                    </div>
                  )}
                  <div className="post-card-body-top">
                    <Typography.Title level={4} className="post-card-title" ellipsis={{ rows: 1 }}>
                      {post.title}
                    </Typography.Title>
                    {post.summary && (
                      <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} className="post-card-summary">
                        {post.summary}
                      </Typography.Paragraph>
                    )}
                    {post.tags && post.tags.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        {post.tags.map((tag) => (
                          <Tag key={tag} color="blue" style={{ cursor: "pointer" }}
                            onClick={(e) => { e.stopPropagation(); searchByTag(tag); }}>
                            {tag}
                          </Tag>
                        ))}
                      </div>
                    )}
                    <div className="post-card-footer" style={{ marginTop: 10 }}>
                      <Typography.Text type="secondary" className="post-card-meta">
                        <Link to={`/users/${post.author.id}`} onClick={(e) => e.stopPropagation()}>{post.author.nickname || post.author.username}</Link> · {dayjs(post.updated_at).format("YYYY-MM-DD HH:mm")} · {post.view_count} 次浏览 · {(post.comment_count ?? 0) + (post.reply_count ?? 0) > 0 && <>{post.comment_count ?? 0} 条评论{(post.reply_count ?? 0) > 0 && <> · {post.reply_count} 条回复</>}</>}
                      </Typography.Text>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      {owner && (
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
        </div>
      )}
    </div>
  );
}
