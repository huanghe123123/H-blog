import { Card, Empty, Select } from "antd";
import { useEffect, useState } from "react";
import { listPosts, type SortBy } from "../api/posts";
import { PostCard } from "../components/PostCard";
import type { Post, PostCategory } from "../types";

const CATEGORIES: { key: PostCategory; label: string; color: string }[] = [
  { key: "技术", label: "技术", color: "#1677ff" },
  { key: "创作", label: "创作", color: "#722ed1" },
  { key: "生活", label: "生活", color: "#52c41a" },
  { key: "交流", label: "交流", color: "#fa8c16" },
  { key: "公告", label: "公告", color: "#ff4d4f" },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "created_at", label: "最新发布" },
  { value: "views", label: "最多浏览" },
  { value: "likes", label: "最多点赞" },
  { value: "comments", label: "最多评论" },
  { value: "score", label: "综合排序" },
];

export function CategoryPage() {
  const [active, setActive] = useState<PostCategory>("技术");
  const [posts, setPosts] = useState<Post[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [topPosts, setTopPosts] = useState<Post[]>([]);

  const loadPosts = async (cat: PostCategory, sort: SortBy) => {
    setPosts(await listPosts({ category: cat, sort_by: sort }));
  };

  const loadTop = async (cat: PostCategory) => {
    setTopPosts(await listPosts({ category: cat, sort_by: "score", limit: 5 }));
  };

  useEffect(() => {
    void loadPosts(active, sortBy);
    void loadTop(active);
  }, []);

  const onCategoryChange = (cat: PostCategory) => {
    setActive(cat);
    void loadPosts(cat, sortBy);
    void loadTop(cat);
  };

  const onSortChange = (sort: SortBy) => {
    setSortBy(sort);
    void loadPosts(active, sort);
  };

  return (
    <div className="profile-layout">
      <Card title="文章分类" className="side-card profile-left-card" style={{ borderRadius: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {CATEGORIES.map((cat) => (
            <div
              key={cat.key}
              onClick={() => onCategoryChange(cat.key)}
              style={{
                cursor: "pointer",
                padding: "10px 16px",
                borderRadius: 0,
                borderLeft: active === cat.key ? `3px solid ${cat.color}` : "3px solid transparent",
                background: active === cat.key ? `${cat.color}11` : "transparent",
                color: active === cat.key ? cat.color : "#666",
                fontWeight: active === cat.key ? 600 : 400,
                fontSize: 15,
                transition: "all 0.15s",
              }}
            >
              {cat.label}
            </div>
          ))}
        </div>
      </Card>
      <div className="profile-center">
        <div className="category-nav-horizontal">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.key}
              onClick={() => onCategoryChange(cat.key)}
              className={`category-nav-horizontal-item${active === cat.key ? " active" : ""}`}
              style={{
                "--cat-color": cat.color,
              } as React.CSSProperties}
            >
              {cat.label}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 16 }}>
          <Select value={sortBy} options={SORT_OPTIONS} style={{ width: 120 }} onChange={onSortChange} />
        </div>
        {posts.length === 0 ? (
          <Empty description={`暂无"${active}"类文章`} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} showActions />
            ))}
          </div>
        )}
      </div>
      <div className="profile-right-col">
        <Card title={`${active}热文`} className="side-card" style={{ borderRadius: 0 }}>
          {topPosts.length === 0 ? (
            <Empty description="暂无" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {topPosts.map((post) => (
                <PostCard key={post.id} post={post} showCover={false} shadow={false} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
