import { Button, Card, Checkbox, DatePicker, Empty, Input, Popconfirm, Select, Space, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { Edit3, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { deletePost, listPosts, type SortBy } from "../api/posts";
import { LikeButton } from "../components/LikeButton";
import { useAuth } from "../hooks/useAuth";
import type { Post } from "../types";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "created_at", label: "最新发布" },
  { value: "views", label: "最多浏览" },
  { value: "likes", label: "最多点赞" },
  { value: "comments", label: "最多评论" },
  { value: "score", label: "综合排序" },
];

export function PostListPage({ showCreateButton = true }: { showCreateButton?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [keyword, setKeyword] = useState(searchParams.get("keyword") || "");
  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [dateFrom, setDateFrom] = useState<dayjs.Dayjs | null>(null);
  const [dateTo, setDateTo] = useState<dayjs.Dayjs | null>(null);
  const [fuzzy, setFuzzy] = useState(false);

  const load = async () => {
    setPosts(await listPosts({
      keyword: keyword || undefined,
      sort_by: sortBy,
      date_from: dateFrom?.startOf("day").toISOString(),
      date_to: dateTo?.endOf("day").toISOString(),
      fuzzy: keyword ? fuzzy : undefined,
    }));
  };

  const searchByTag = (tag: string) => {
    setKeyword(tag);
    listPosts({ keyword: tag, sort_by: sortBy }).then(setPosts);
  };

  useEffect(() => {
    const initial = searchParams.get("keyword");
    if (initial) {
      setKeyword(initial);
      listPosts({ keyword: initial, sort_by: "created_at" }).then(setPosts);
    } else {
      void load();
    }
  }, []);

  const onDeletePost = async (id: number) => {
    await deletePost(id);
    message.success("文章已删除");
    await load();
  };

  return (
    <section>
      <div className="page-title-row">
        <Space wrap>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} prefix={<Search size={16} />} placeholder="搜索标题、摘要、内容、标签、作者，空格分隔多关键词" onPressEnter={load} style={{ width: 400 }} />
          <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="起始日期" allowClear />
          <DatePicker value={dateTo} onChange={setDateTo} placeholder="截止日期" allowClear />
          <Select value={sortBy} options={SORT_OPTIONS} style={{ width: 120 }} onChange={(v) => { setSortBy(v); load(); }} />
          <Button type="primary" onClick={load}>搜索</Button>
          <Checkbox checked={fuzzy} onChange={(e) => setFuzzy(e.target.checked)}>模糊搜索</Checkbox>
        </Space>
        {showCreateButton && user && <Button type="primary" icon={<Plus size={18} />} onClick={() => navigate("/posts/new")} />}
      </div>
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
                  {post.tags && post.tags.length > 0 && (
                    <Space size={4} wrap style={{ marginBottom: 8 }}>
                      {post.tags.map((tag) => (
                        <Tag key={tag} color="blue" style={{ cursor: "pointer" }}
                          onClick={(e) => { e.stopPropagation(); searchByTag(tag); }}>
                          {tag}
                        </Tag>
                      ))}
                    </Space>
                  )}
                  <div className="post-card-footer">
                    <Typography.Text type="secondary" className="post-card-meta">
                      <Link to={`/users/${post.author.id}`} onClick={(e) => e.stopPropagation()}>{post.author.nickname || post.author.username}</Link> · {dayjs(post.updated_at).format("YYYY-MM-DD HH:mm")} · {post.view_count} 次浏览 · {(post.comment_count ?? 0) + (post.reply_count ?? 0) > 0 && <>{post.comment_count ?? 0} 条评论{(post.reply_count ?? 0) > 0 && <> · {post.reply_count} 条回复</>}</>}
                    </Typography.Text>
                    <Space className="post-card-actions" onClick={(e) => e.stopPropagation()}>
                      <LikeButton targetType="post" targetId={post.id} />
                      {user?.role === "admin" && (
                        <>
                          <Button size="small" icon={<Edit3 size={14} />} onClick={() => navigate(`/posts/${post.id}/edit`)} />
                          <Popconfirm title="确认删除文章？" onConfirm={() => onDeletePost(post.id)}>
                            <Button size="small" danger icon={<Trash2 size={14} />} />
                          </Popconfirm>
                        </>
                      )}
                    </Space>
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
