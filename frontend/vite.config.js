import react from "@vitejs/plugin-react";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { defineConfig } from "vite";
var aboutTsPath = resolve(__dirname, "src/data/about.ts");
function aboutWriterPlugin() {
    return {
        name: "about-writer",
        configureServer: function (server) {
            server.middlewares.use("/api/about/write", function (req, res) {
                if (req.method !== "POST") {
                    res.statusCode = 405;
                    res.end();
                    return;
                }
                var body = "";
                req.on("data", function (chunk) { body += chunk; });
                req.on("end", function () {
                    try {
                        var data = JSON.parse(body);
                        var ts = "import type { UserProfile, UserLink } from \"../types\";\n\nexport interface AboutData {\n  nickname: string;\n  avatar_url: string;\n  bio: string;\n  birthday: string | null;\n  gender: string | null;\n  links: UserLink[];\n}\n\nexport const aboutData: AboutData = ".concat(JSON.stringify(data, null, 2), ";\n\nexport function toProfile(data: AboutData): UserProfile {\n  return {\n    id: 0,\n    username: \"\",\n    nickname: data.nickname,\n    avatar_url: data.avatar_url,\n    bio: data.bio,\n    birthday: data.birthday,\n    gender: data.gender,\n    role: \"owner\",\n    created_at: \"\",\n    links: data.links,\n  };\n}\n");
                        writeFileSync(aboutTsPath, ts, "utf-8");
                        res.statusCode = 200;
                        res.end(JSON.stringify({ ok: true }));
                    }
                    catch (e) {
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
                bypass: function (req) {
                    var _a;
                    if ((_a = req.url) === null || _a === void 0 ? void 0 : _a.startsWith("/api/about/"))
                        return false;
                },
            },
        },
    },
});
