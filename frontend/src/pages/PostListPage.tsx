import { Button, Empty, Input, Popconfirm, Space, Table, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { Edit3, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deletePost, listPosts } from "../api/posts";
import { useAuth } from "../hooks/useAuth";
import type { Post } from "../types";

export function PostListPage() {
  const { user } = useAuth();
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
        {user && <Button type="primary"><Link to="/posts/new">新建文章</Link></Button>}
      </div>
      <Space className="toolbar" wrap>
        <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} prefix={<Search size={16} />} placeholder="搜索标题、摘要、内容" onPressEnter={load} />
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
          { title: "更新时间", dataIndex: "updated_at", render: (value) => dayjs(value).format("YYYY-MM-DD HH:mm") },
          ...(user?.role === "admin"
            ? [{
                title: "操作", key: "actions", width: 120,
                render: (_: unknown, record: Post) => (
                  <Space>
                    <Link to={`/posts/${record.id}/edit`}><Button size="small" icon={<Edit3 size={14} />} /></Link>
                    <Popconfirm title="确认删除文章？" onConfirm={() => onDeletePost(record.id)}>
                      <Button size="small" danger icon={<Trash2 size={14} />} />
                    </Popconfirm>
                  </Space>
                )
              }]
            : [])
        ]}
      />
    </section>
  );
}
