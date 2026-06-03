import { api } from "./client";

export async function getLikeStatus(target_type: "post" | "comment", target_id: number) {
  const { data } = await api.get<{ liked: boolean; count: number }>("/likes/status", { params: { target_type, target_id } });
  return data;
}

export async function like(target_type: "post" | "comment", target_id: number) {
  await api.post("/likes", { target_type, target_id });
}

export async function unlike(target_type: "post" | "comment", target_id: number) {
  await api.delete("/likes", { data: { target_type, target_id } });
}
