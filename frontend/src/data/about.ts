import type { UserProfile, UserLink } from "../types";

export interface AboutData {
  nickname: string;
  avatar_url: string;
  bio: string;
  birthday: string | null;
  gender: string | null;
  links: UserLink[];
}

export const aboutData: AboutData = {
  nickname: "",
  avatar_url: "",
  bio: "",
  birthday: null,
  gender: null,
  links: [],
};

export function toProfile(data: AboutData): UserProfile {
  return {
    id: 0,
    username: "",
    nickname: data.nickname,
    avatar_url: data.avatar_url,
    bio: data.bio,
    birthday: data.birthday,
    gender: data.gender,
    role: "owner",
    created_at: "",
    links: data.links,
  };
}
