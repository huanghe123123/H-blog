import { Avatar, Button, Card, Tag, Typography } from "antd";
import { Edit3, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { UserProfile } from "../types";

const genderLabels: Record<string, string> = { male: "男", female: "女", other: "其他" };
const roleLabels: Record<string, string> = { admin: "管理员", moderator: "版主", user: "普通用户" };

interface ProfileSideCardProps {
  profile: UserProfile;
  publishedCount: number;
  yearsCount: number;
  age: number | null;
  isOwn: boolean;
  onEdit?: () => void;
}

export function ProfileSideCard({ profile, publishedCount, yearsCount, age, isOwn, onEdit }: ProfileSideCardProps) {
  const navigate = useNavigate();
  return (
    <Card className="side-card profile-left-card">
      <div className="side-profile">
        <Avatar size={80} src={profile.avatar_url} icon={<UserRound />} style={{ cursor: "pointer" }} onClick={() => navigate(`/users/${profile.id}`)} />
        <Typography.Title level={4} style={{ margin: "12px 0 4px" }}>
          {profile.nickname || profile.username}
        </Typography.Title>
        <Tag color={profile.role === "admin" ? "red" : profile.role === "moderator" ? "blue" : "default"}>
          {roleLabels[profile.role] || profile.role}
        </Tag>
        {profile.bio && (
          <Typography.Paragraph type="secondary" style={{ marginTop: 10, textAlign: "center", fontSize: 14, wordBreak: "break-word", overflowWrap: "break-word" }}>
            {profile.bio}
          </Typography.Paragraph>
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
            <span className="side-stat-label">年份</span>
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
      </div>
    </Card>
  );
}
