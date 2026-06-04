import { api } from "./client";
import type { User } from "../types";

export async function register(payload: { username: string; email: string; password: string }) {
  const { data } = await api.post<User>("/auth/register", payload);
  return data;
}

export async function login(payload: { identifier: string; password: string }) {
  const { data } = await api.post<User>("/auth/login", payload);
  return data;
}

export async function refresh() {
  const { data } = await api.post<User>("/auth/refresh");
  return data;
}

export async function logout() {
  await api.post("/auth/logout");
}

export async function verifyEmail(token: string) {
  const { data } = await api.post<{ message: string }>("/auth/verify-email", { token });
  return data;
}

export async function resendVerification(email: string) {
  const { data } = await api.post<{ message: string }>("/auth/resend-verification", { email });
  return data;
}
