import { api } from "./client";
import type { User, UserLink, UserProfile } from "../types";

export async function getMe() {
  const { data } = await api.get<User>("/users/me");
  return data;
}

export async function getUserProfile(id: number) {
  const { data } = await api.get<UserProfile>(`/users/${id}`);
  return data;
}

export async function getSiteOwner() {
  const { data } = await api.get<UserProfile>("/users/owner");
  return data;
}

export async function updateMe(payload: Partial<Pick<User, "nickname" | "avatar_url" | "bio" | "birthday" | "gender">> & { links?: UserLink[] | null }) {
  const { data } = await api.put<User>("/users/me", payload);
  return data;
}
