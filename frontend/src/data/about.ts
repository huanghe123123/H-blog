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
  "nickname": "huanghe123123",
  "avatar_url": "https://github.com/huanghe123123/H-blog/blob/dev/develper_avatar.jpeg?raw=true",
  "bio": "",
  "birthday": "2008-05-15",
  "gender": null,
  "links": []
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
