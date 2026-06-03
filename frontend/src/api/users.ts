import { api } from "./client";
import type { User, UserProfile } from "../types";

export async function getMe() {
  const { data } = await api.get<User>("/users/me");
  return data;
}

export async function getUserProfile(id: number) {
  const { data } = await api.get<UserProfile>(`/users/${id}`);
  return data;
}

export async function updateMe(payload: Partial<Pick<User, "nickname" | "avatar_url" | "bio" | "birthday" | "gender">>) {
  const { data } = await api.put<User>("/users/me", payload);
  return data;
}
