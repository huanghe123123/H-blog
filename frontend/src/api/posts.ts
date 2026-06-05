import { api } from "./client";
import type { Post, PostCategory, PostStatus } from "../types";

export type PostPayload = {
  title: string;
  summary?: string;
  content: string;
  cover_url?: string;
  tags?: string[];
  category: PostCategory;
  status: PostStatus;
};

export type SortBy = "created_at" | "views" | "likes" | "comments" | "score";

export const TAG_PRESETS = ["Python", "JavaScript", "React", "FastAPI", "PostgreSQL", "Docker", "Linux", "AI", "开源", "教程", "随笔"];

export async function listPosts(params?: {
  keyword?: string;
  status?: PostStatus;
  author_id?: number;
  sort_by?: SortBy;
  date_from?: string;
  date_to?: string;
  fuzzy?: boolean;
  limit?: number;
  category?: PostCategory;
}) {
  const endpoint = params?.keyword ? "/posts/search" : "/posts";
  const query: Record<string, string> = {};
  if (params?.keyword) query.keyword = params.keyword;
  if (params?.status) query.status = params.status;
  if (params?.author_id) query.author_id = String(params.author_id);
  if (params?.sort_by) query.sort_by = params.sort_by;
  if (params?.date_from) query.date_from = params.date_from;
  if (params?.date_to) query.date_to = params.date_to;
  if (params?.fuzzy) query.fuzzy = "true";
  if (params?.limit) query.limit = String(params.limit);
  if (params?.category) query.category = params.category;
  const { data } = await api.get<Post[]>(endpoint, { params: query });
  return data;
}

export async function getPost(id: number) {
  const { data } = await api.get<Post>(`/posts/${id}`);
  return data;
}

export async function createPost(payload: PostPayload) {
  const { data } = await api.post<Post>("/posts", payload);
  return data;
}

export async function updatePost(id: number, payload: Partial<PostPayload>) {
  const { data } = await api.put<Post>(`/posts/${id}`, payload);
  return data;
}

export async function deletePost(id: number) {
  await api.delete(`/posts/${id}`);
}
