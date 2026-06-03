import { api } from "./client";
import type { User } from "../types";

export async function getMe() {
  const { data } = await api.get<User>("/users/me");
  return data;
}

export async function updateMe(payload: Partial<Pick<User, "nickname" | "avatar_url" | "bio">>) {
  const { data } = await api.put<User>("/users/me", payload);
  return data;
}
