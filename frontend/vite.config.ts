import react from "@vitejs/plugin-react";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { defineConfig } from "vite";

const aboutTsPath = resolve(__dirname, "src/data/about.ts");

function aboutWriterPlugin() {
  return {
    name: "about-writer",
    configureServer(server: any) {
      server.middlewares.use("/api/about/write", (req: any, res: any) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        let body = "";
        req.on("data", (chunk: string) => { body += chunk; });
        req.on("end", () => {
          try {
            const data = JSON.parse(body);
            const ts = `import type { UserProfile, UserLink } from "../types";

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

export const aboutData: AboutData = ${JSON.stringify(data, null, 2)};

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
`;
            writeFileSync(aboutTsPath, ts, "utf-8");
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true }));
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: e.message }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), aboutWriterPlugin()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        bypass(req) {
          if (req.url?.startsWith("/api/about/")) return req.url;
        },
      },
    },
  },
});
