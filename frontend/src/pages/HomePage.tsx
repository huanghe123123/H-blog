import { Card, Empty, Typography } from "antd";
import MDEditor from "@uiw/react-md-editor";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { fetchSiteConfig } from "../api/config";
import { listPosts } from "../api/posts";
import { getSiteOwner } from "../api/users";
import { PostCard } from "../components/PostCard";
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
              <PostCard key={post.id} post={post} coverOnTop />
            ))}
          </div>
        )}
      </div>
      {owner && (
        <div className="profile-right-col">
          <Card title="站主的最近文章" className="side-card" style={{ borderRadius: 0 }}>
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
        </div>
      )}
    </div>
  );
}
