import { Button, Empty, Input, Select, Space, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listPosts } from "../api/posts";
import type { Post, PostStatus } from "../types";

export function PostListPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<PostStatus | undefined>();

  const load = async () => setPosts(await listPosts({ keyword: keyword || undefined, status }));

  useEffect(() => {
    void load();
  }, [status]);

  return (
    <section>
      <div className="page-title-row">
        <Typography.Title level={2}>文章</Typography.Title>
        <Button type="primary"><Link to="/posts/new">新建文章</Link></Button>
      </div>
      <Space className="toolbar" wrap>
        <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} prefix={<Search size={16} />} placeholder="搜索标题、摘要、内容" onPressEnter={load} />
        <Select allowClear placeholder="状态" style={{ width: 140 }} value={status} onChange={setStatus} options={[{ value: "draft", label: "草稿" }, { value: "published", label: "已发布" }]} />
        <Button onClick={load}>搜索</Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={posts}
        locale={{ emptyText: <Empty description="暂无文章" /> }}
        columns={[
          { title: "标题", dataIndex: "title", render: (title, record) => <Link to={`/posts/${record.id}`}>{title}</Link> },
          { title: "作者", dataIndex: ["author", "username"] },
          { title: "状态", dataIndex: "status", render: (value) => <Tag color={value === "published" ? "green" : "gold"}>{value}</Tag> },
          { title: "浏览", dataIndex: "view_count", width: 90 },
          { title: "更新时间", dataIndex: "updated_at", render: (value) => dayjs(value).format("YYYY-MM-DD HH:mm") }
        ]}
      />
    </section>
  );
}
