export type User = {
  id: number;
  username: string;
  email: string;
  nickname?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  birthday?: string | null;
  gender?: string | null;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  verification_url?: string | null;
  created_at: string;
  updated_at: string;
};

export type UserBrief = Pick<User, "id" | "username" | "nickname" | "avatar_url">;

export type UserProfile = Pick<User, "id" | "username" | "nickname" | "avatar_url" | "bio" | "birthday" | "gender" | "role" | "created_at">;

export type PostStatus = "draft" | "published";

export type Post = {
  id: number;
  title: string;
  summary?: string | null;
  content: string;
  cover_url?: string | null;
  status: PostStatus;
  view_count: number;
  author_id: number;
  author: UserBrief;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
};

export type Comment = {
  id: number;
  content: string;
  user_id: number;
  post_id: number;
  user: UserBrief;
  created_at: string;
  updated_at: string;
};

export type Token = {
  access_token: string;
  token_type: string;
};
