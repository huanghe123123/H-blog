import { api, TOKEN_KEY } from "./client";
import type { Token, User } from "../types";

export async function register(payload: { username: string; email: string; password: string }) {
  const { data } = await api.post<User>("/auth/register", payload);
  return data;
}

export async function login(payload: { identifier: string; password: string }) {
  const { data } = await api.post<Token>("/auth/login", payload);
  localStorage.setItem(TOKEN_KEY, data.access_token);
  return data;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}
