import { api } from "./client";
import type { Comment } from "../types";

export async function listComments(postId: number) {
  const { data } = await api.get<Comment[]>(`/posts/${postId}/comments`);
  return data;
}

export async function listProfileComments(userId: number) {
  const { data } = await api.get<Comment[]>(`/users/${userId}/comments`);
  return data;
}

export async function createComment(postId: number, content: string, parentId?: number, replyToUserId?: number, replyPreview?: string) {
  const { data } = await api.post<Comment>(`/posts/${postId}/comments`, {
    content,
    parent_id: parentId ?? null,
    reply_to_user_id: replyToUserId ?? null,
    reply_preview: replyPreview ?? null,
  });
  return data;
}

export async function createProfileComment(userId: number, content: string, parentId?: number, replyToUserId?: number, replyPreview?: string) {
  const { data } = await api.post<Comment>(`/users/${userId}/comments`, {
    content,
    parent_id: parentId ?? null,
    reply_to_user_id: replyToUserId ?? null,
    reply_preview: replyPreview ?? null,
  });
  return data;
}

export async function deleteComment(id: number) {
  await api.delete(`/comments/${id}`);
}

export async function deleteProfileComment(id: number) {
  await api.delete(`/users/comments/${id}`);
}
