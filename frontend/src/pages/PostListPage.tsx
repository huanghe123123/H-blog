import { Button, Checkbox, DatePicker, Empty, Input, Select, Space } from "antd";
import dayjs from "dayjs";
import { Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { listPosts, type SortBy } from "../api/posts";
import { PostCard } from "../components/PostCard";
import { useAuth } from "../hooks/useAuth";
import type { Post, PostCategory } from "../types";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "created_at", label: "最新发布" },
  { value: "views", label: "最多浏览" },
  { value: "likes", label: "最多点赞" },
  { value: "comments", label: "最多评论" },
  { value: "score", label: "综合排序" },
];

const CATEGORY_OPTIONS: { value: PostCategory | ""; label: string }[] = [
  { value: "", label: "全部分类" },
  { value: "技术", label: "技术" },
  { value: "创作", label: "创作" },
  { value: "生活", label: "生活" },
  { value: "交流", label: "交流" },
  { value: "公告", label: "公告" },
];

export function PostListPage({ showCreateButton = true, syncUrl = true }: { showCreateButton?: boolean; syncUrl?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [keyword, setKeyword] = useState(searchParams.get("keyword") || "");
  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [dateFrom, setDateFrom] = useState<dayjs.Dayjs | null>(null);
  const [dateTo, setDateTo] = useState<dayjs.Dayjs | null>(null);
  const [fuzzy, setFuzzy] = useState(false);
  const [category, setCategory] = useState<PostCategory | "">("");

  const load = async (kw?: string) => {
    const k = kw ?? keyword;
    if (syncUrl) setSearchParams(k ? { keyword: k } : {}, { replace: true });
    setPosts(await listPosts({
      keyword: k || undefined,
      sort_by: sortBy,
      date_from: dateFrom?.startOf("day").toISOString(),
      date_to: dateTo?.endOf("day").toISOString(),
      fuzzy: k ? fuzzy : undefined,
      category: category || undefined,
    }));
  };

  useEffect(() => {
    const initial = searchParams.get("keyword") || "";
    setKeyword(initial);
    void load(initial);
  }, []);

  return (
    <section>
      <div className="page-title-row">
        <Space wrap>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} prefix={<Search size={16} />} placeholder="搜索标题、摘要、内容、标签、作者，空格分隔多关键词" onPressEnter={() => load()} style={{ width: 400 }} />
          <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="起始日期" allowClear />
          <DatePicker value={dateTo} onChange={setDateTo} placeholder="截止日期" allowClear />
          <Select value={category} options={CATEGORY_OPTIONS} style={{ width: 110 }} onChange={(v) => { setCategory(v); load(); }} />
          <Select value={sortBy} options={SORT_OPTIONS} style={{ width: 120 }} onChange={(v) => { setSortBy(v); load(); }} />
          <Button type="primary" onClick={() => load()}>搜索</Button>
          <Checkbox checked={fuzzy} onChange={(e) => setFuzzy(e.target.checked)}>模糊搜索</Checkbox>
        </Space>
        {showCreateButton && user && <Button type="primary" icon={<Plus size={18} />} onClick={() => navigate("/posts/new")} />}
      </div>
      {posts.length === 0 ? (
        <Empty description="暂无文章" />
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} showActions onDeleted={load} />
          ))}
        </Space>
      )}
    </section>
  );
}
