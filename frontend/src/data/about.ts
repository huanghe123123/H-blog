import type { UserProfile, UserLink } from "../types";

export interface AboutData {
  enabled: boolean;
  nickname: string;
  avatar_url: string;
  bio: string;
  content: string;
  birthday: string | null;
  gender: string | null;
  links: UserLink[];
}

export const aboutData: AboutData = {
  "enabled": true,
  "nickname": "huanghe123123",
  "avatar_url": "https://github.com/huanghe123123/H-blog/blob/dev/develper_avatar.jpeg?raw=true",
  "birthday": "2008-05-15",
  "gender": "male",
  "bio": "<svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle;margin-right:4px\"><path d=\"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/></svg>Zhangshu, Jiangxi\n<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:middle\"><path d=\"M12 5v14\"/><path d=\"m19 12-7 7-7-7\"/></svg>\nHangzhou,Zhejiang",
  "content": "<h1 style=\"text-align: center;color:lightblue\";>\n欢迎来到我<del>和DeepseekV4 Pro以及GPT5.5</del>开发的博客网站!!!ヽ(✿ﾟ▽ﾟ)ノ\n</h1>\n<h2>关于本站</h2>\n<p>这个项目是作为X-Lab软件团队训练营的训练项目开发的，由于我平时实在没时间<del>而且懒且拖延</del>，对相关知识还不甚了解的时候就直接开始硬做。坦率地讲，我依赖Vibe coding的程度极高。<del>不过点子可一直都是我在出(๑•̀ㅂ•́)و✧</del>\n\n但是在做的过程中我也的确了解到了不少东西，至少还是大概明白了我手下这个网站的运作方式，希望我能在未来能有机会真的成为一名全栈开发者。\n\n关于这个网站，虽然做得甚为一般，但我刚开始做的时候就想着要让它成为一个——无论是对建站者还是使用者——都比较易用的多用户博客，<del>(虽然大概率没人用)</del>希望能够帮到有需要的人。\n\n这个网站基本上可以说是从零开始的，现成的东西只用了Ant design。不过累的人不是我[ac01]\n\n做的过程中，我也参考了诸多前辈的博客，在此感谢喵\nhttps://blog.tonycrane.cc/\nhttps://mem.ac/posts/\nhttps://nekosc.com/\nhttps://blog.skk.moe/\n</p>\n<h2>关于我</h2>\n<div style=\"text-align: center;\">\n浙江大学2025级人工智能专业本科生\n\n<del>Minecraft十年老玩家</del>\n<del>Claude code/Codex User</del>\n刚开始爬塔\n<del>憧憬成为</del>飞盘糕手\n二次元小资历\n</div>\n<h2>最后</h2>\n如果你也想试试自己部署一个多用户博客,不妨试试点击左侧头像去仓库看看,如果觉得可堪一用,不妨给我点个star。另外,如果哪里有问题,还请务必提个issue。\n\n**非常感谢<(_ _)>**\n\n如果不希望此页面出现在你的网站里,可以去配置项里面将about设为false。 \n\n\n\n",
  "links": [
    {
      "url": "https://github.com/huanghe123123",
      "label": "Github",
      "icon": "fa-brands fa-github"
    },
    {
      "url": "https://qm.qq.com/q/88pxMOGvte",
      "label": "QQ",
      "icon": "fa-brands fa-qq"
    },
    {
      "url": "https://x.com/YtZszx1901?s=09",
      "label": "X",
      "icon": "fa-brands fa-twitter"
    },
    {
      "url": "mailto:s3334520@163.com",
      "label": "Mail",
      "icon": "fa-solid fa-envelope"
    }
  ]
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
    role: "developer",
    created_at: "",
    links: data.links,
  };
}
