import MDEditor from "@uiw/react-md-editor";
import { Avatar, Button, Card, Tag, Tooltip, Typography } from "antd";
import rehypeRaw from "rehype-raw";
import remarkBreaks from "remark-breaks";
import { Edit3, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { resolveAcfunEmoji } from "../utils/acfun";
import type { UserProfile } from "../types";

const genderLabels: Record<string, string> = { male: "男", female: "女", other: "其他" };
const roleLabels: Record<string, string> = { admin: "管理员", owner: "站主", moderator: "版主", user: "普通用户", developer: "开发者" };

interface ProfileSideCardProps {
  profile: UserProfile;
  publishedCount: React.ReactNode;
  yearsCount: React.ReactNode;
  age: React.ReactNode;
  isOwn: boolean;
  onEdit?: () => void;
  onAvatarClick?: () => void;
}

export function ProfileSideCard({ profile, publishedCount, yearsCount, age, isOwn, onEdit, onAvatarClick }: ProfileSideCardProps) {
  const navigate = useNavigate();
  return (
    <Card className="side-card profile-left-card" style={{ borderRadius: 0 }} title={profile.role === "owner" ? "站主" : undefined}>
      <div className="side-profile">
        <Avatar size={80} src={profile.avatar_url} icon={<UserRound />} style={{ cursor: "pointer" }} onClick={() => onAvatarClick ? onAvatarClick() : navigate(`/users/${profile.id}`)} />
        <Typography.Title level={4} style={{ margin: "12px 0 4px" }}>
          {profile.nickname || profile.username}
        </Typography.Title>
        <Tag color={profile.role === "owner" ? "gold" : profile.role === "admin" ? "red" : profile.role === "moderator" ? "blue" : "default"}>
          {roleLabels[profile.role] || profile.role}
        </Tag>
        {profile.bio && (
          <div data-color-mode="light" style={{ marginTop: 10, fontSize: 14, wordBreak: "break-word", overflowWrap: "break-word" }}>
            <MDEditor.Markdown source={resolveAcfunEmoji(profile.bio)} remarkPlugins={[remarkBreaks]} rehypePlugins={[rehypeRaw]} />
          </div>
        )}
        {isOwn && onEdit && (
          <Button type="text" size="small" icon={<Edit3 size={14} />} onClick={onEdit} style={{ marginTop: 8 }}>
            编辑资料
          </Button>
        )}
        <div className="side-stats">
          <div className="side-stat">
            <span className="side-stat-num">{publishedCount}</span>
            <span className="side-stat-label">文章</span>
          </div>
          <div className="side-stat">
            <span className="side-stat-num">{yearsCount}</span>
            <span className="side-stat-label">加入年数</span>
          </div>
          <div className="side-stat">
            <span className="side-stat-num">{age ?? "-"}</span>
            <span className="side-stat-label">岁</span>
          </div>
          <div className="side-stat">
            <span className="side-stat-num">{profile.gender ? (genderLabels[profile.gender] ?? profile.gender) : "-"}</span>
            <span className="side-stat-label">性别</span>
          </div>
        </div>
        {profile.links && profile.links.length > 0 && (
          <div className="side-links">
            {profile.links.map((link, i) => (
              <Tooltip key={i} title={link.label}>
                <a className="side-link-icon" href={link.url} target="_blank" rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}>
                  <i className={link.icon} />
                </a>
              </Tooltip>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
