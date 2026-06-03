import { api } from "./client";
import type { Post, PostStatus } from "../types";

export type PostPayload = {
  title: string;
  summary?: string;
  content: string;
  cover_url?: string;
  status: PostStatus;
};

export async function listPosts(params?: { keyword?: string; status?: PostStatus; author_id?: number }) {
  const endpoint = params?.keyword ? "/posts/search" : "/posts";
  const query: Record<string, string> = {};
  if (params?.keyword) query.keyword = params.keyword;
  if (params?.status) query.status = params.status;
  if (params?.author_id) query.author_id = String(params.author_id);
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
