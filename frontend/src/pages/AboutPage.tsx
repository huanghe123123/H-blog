import { Card } from "antd";
import MDEditor from "@uiw/react-md-editor";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import { ProfileSideCard } from "../components/ProfileSideCard";
import { aboutData, toProfile } from "../data/about";
import { resolveAcfunEmoji } from "../utils/acfun";

export function AboutPage() {
  return (
    <div className="profile-layout">
      <ProfileSideCard
        profile={toProfile(aboutData)}
        publishedCount={"∞"}
        yearsCount={"∞"}
        age={18}
        isOwn={false}
        onAvatarClick={() => window.open("https://github.com/huanghe123123/H-blog", "_blank")}
      />
      <div className="profile-center">
        {aboutData.content && (
          <Card style={{ borderRadius: 0 }}>
            <div data-color-mode="light">
              <MDEditor.Markdown
                source={resolveAcfunEmoji(aboutData.content)}
                remarkPlugins={[remarkBreaks]}
                rehypePlugins={[rehypeRaw]}
              />
            </div>
          </Card>
        )}
      </div>
      <div className="profile-right-col" />
    </div>
  );
}
