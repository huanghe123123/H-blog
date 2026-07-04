import { Card, Empty, Typography } from "antd";
import MDEditor from "@uiw/react-md-editor";
import remarkBreaks from "remark-breaks";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { fetchSiteConfig } from "../api/config";
import { listPosts } from "../api/posts";
import { getSiteOwner } from "../api/users";
import { useAuth } from "../hooks/useAuth";
import { AgentChat } from "../components/AgentChat";
import { PostCard } from "../components/PostCard";
import { ProfileSideCard } from "../components/ProfileSideCard";
import type { Post, UserProfile } from "../types";
import { resolveAcfunEmoji } from "../utils/acfun";

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

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

// 按一天中的时段给出问候语 — 这是真实信息，不是装饰
function greeting(hour: number): string {
  if (hour < 5) return "夜深了";
  if (hour < 11) return "早安";
  if (hour < 13) return "午安";
  if (hour < 18) return "下午好";
  if (hour < 23) return "晚上好";
  return "夜深了";
}

export function HomePage() {
  const { user } = useAuth();
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [siteName, setSiteName] = useState("");
  const [siteDesc, setSiteDesc] = useState("");
  const [nameColor, setNameColor] = useState("#1f2d3d");
  const [descColor, setDescColor] = useState("#6c757e");
  const [greetingEnabled, setGreetingEnabled] = useState(true);
  const [tagline, setTagline] = useState("");
  const [hotPosts, setHotPosts] = useState<Post[]>([]);
  const [ownerPosts, setOwnerPosts] = useState<Post[]>([]);

  useEffect(() => {
    fetchSiteConfig().then((cfg) => {
      setSiteName(cfg.site_name);
      setSiteDesc(cfg.site_description);
      setNameColor(cfg.site_name_color);
      setDescColor(cfg.site_description_color);
      setGreetingEnabled(cfg.home?.greeting_enabled ?? true);
      setTagline(cfg.home?.tagline ?? "");
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
  const now = dayjs();
  const greet = greeting(now.hour());

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
        <section className="home-hero">
          {greetingEnabled && (
            <div className="home-hero-eyebrow">
              <span className="home-hero-dot" />
              <span>{greet}</span>
              <span className="home-hero-date">{now.format("YYYY.MM.DD")} {WEEKDAYS[now.day()]}</span>
            </div>
          )}
          <Typography.Title level={2} className="home-hero-title" style={{ color: nameColor }}>{siteName}</Typography.Title>
          <span className="home-hero-accent" />
          {siteDesc && (
            <div data-color-mode="light" className="site-desc home-hero-desc" style={{ ["--desc-color" as string]: descColor }}>
              <MDEditor.Markdown source={resolveAcfunEmoji(siteDesc)} remarkPlugins={[remarkBreaks]} />
            </div>
          )}
          {tagline && <div className="home-hero-tagline">{tagline}</div>}
        </section>
        <div className="home-section-head">
          <span className="home-section-eyebrow">TRENDING</span>
          <Typography.Title level={4} className="home-section-title">热门文章</Typography.Title>
        </div>
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
      {user && <AgentChat context={{ page: "home" }} />}
    </div>
  );
}
