import { Button, Popconfirm, Select, Switch, Table, Tag, Typography, message } from "antd";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteUser, listUsers, updateUserRole, updateUserStatus, type AdminUser } from "../api/admin";
import { useAuth } from "../hooks/useAuth";

const ROLE_OPTIONS = [
  { value: "user", label: "用户" },
  { value: "moderator", label: "版主" },
  { value: "admin", label: "管理员" }
];

const isAdminLike = (role: string) => role === "admin" || role === "owner";

export function AdminUsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setUsers(await listUsers({ limit: 200 }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onRoleChange = async (userId: number, role: string) => {
    await updateUserRole(userId, role);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    message.success("角色已更新");
  };

  const onStatusChange = async (userId: number, checked: boolean) => {
    await updateUserStatus(userId, checked);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: checked } : u)));
    message.success(checked ? "用户已启用" : "用户已停用");
  };

  const onDelete = async (userId: number) => {
    const { message: msg } = await deleteUser(userId);
    message.success(msg);
    await load();
  };

  return (
    <section>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={users}
        columns={[
          { title: "ID", dataIndex: "id", width: 60 },
          { title: "用户名", dataIndex: "username", render: (v, record) => <Link to={`/users/${record.id}`}>{v}</Link> },
          { title: "邮箱", dataIndex: "email" },
          { title: "昵称", dataIndex: "nickname", render: (v) => v || "-" },
          {
            title: "角色",
            dataIndex: "role",
            render: (role, record) => (
              <Select
                size="small"
                value={role}
                options={ROLE_OPTIONS}
                style={{ width: 100 }}
                disabled={record.id === me?.id || record.role === "owner" || (!isAdminLike(me?.role ?? "") && record.role === "admin")}
                onChange={(value) => onRoleChange(record.id, value)}
              />
            )
          },
          {
            title: "状态",
            dataIndex: "is_active",
            render: (active, record) => (
              <Switch
                checked={active}
                disabled={record.id === me?.id || record.role === "owner" || (!isAdminLike(me?.role ?? "") && record.role === "admin")}
                onChange={(checked) => onStatusChange(record.id, checked)}
              />
            )
          },
          {
            title: "已验证",
            dataIndex: "is_verified",
            render: (v) => <Tag color={v ? "green" : "orange"}>{v ? "已验证" : "未验证"}</Tag>
          },
          {
            title: "操作",
            key: "actions",
            width: 80,
            render: (_, record) => {
              if (record.id === me?.id || record.role === "owner") return null;
              if (record.role === "admin" && !isAdminLike(me?.role ?? "")) return null;
              return (
                <Popconfirm title="确认删除该用户？" onConfirm={() => onDelete(record.id)}>
                  <Button size="small" danger icon={<Trash2 size={14} />} />
                </Popconfirm>
              );
            }
          }
        ]}
      />
    </section>
  );
}
