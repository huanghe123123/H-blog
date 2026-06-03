import { api } from "./client";

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  nickname: string | null;
  role: string;
  is_active: boolean;
  is_verified: boolean;
}

export async function listUsers(params?: { skip?: number; limit?: number }) {
  const { data } = await api.get<AdminUser[]>("/admin/users", { params });
  return data;
}

export async function updateUserRole(userId: number, role: string) {
  const { data } = await api.patch<AdminUser>(`/admin/users/${userId}/role`, { role });
  return data;
}

export async function updateUserStatus(userId: number, isActive: boolean) {
  const { data } = await api.patch<AdminUser>(`/admin/users/${userId}/status`, { is_active: isActive });
  return data;
}

export async function deleteUser(userId: number) {
  const { data } = await api.delete<{ message: string }>(`/admin/users/${userId}`);
  return data;
}
