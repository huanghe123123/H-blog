export type UserLink = {
  url: string;
  label: string;
  icon: string;
};

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
  links?: UserLink[] | null;
  created_at: string;
  updated_at: string;
};

export type UserBrief = Pick<User, "id" | "username" | "nickname" | "avatar_url">;

export type UserProfile = Pick<User, "id" | "username" | "nickname" | "avatar_url" | "bio" | "birthday" | "gender" | "role" | "created_at"> & { links?: UserLink[] | null };

export type PostStatus = "draft" | "published";

export type PostCategory = "技术" | "创作" | "生活" | "交流" | "公告";

export type Post = {
  id: number;
  title: string;
  summary?: string | null;
  content: string;
  cover_url?: string | null;
  tags?: string[] | null;
  category: PostCategory;
  status: PostStatus;
  view_count: number;
  like_count?: number;
  comment_count?: number;
  reply_count?: number;
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
  post_id: number | null;
  parent_id: number | null;
  reply_to_user: UserBrief | null;
  reply_preview: string | null;
  user: UserBrief;
  replies: Comment[];
  created_at: string;
  updated_at: string;
};

export type Token = {
  access_token: string;
  token_type: string;
};
