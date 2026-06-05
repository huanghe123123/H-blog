import { Button, Card } from "antd";
import { Edit3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProfileSideCard } from "../components/ProfileSideCard";
import { aboutData, toProfile } from "../data/about";
import { useAuth } from "../hooks/useAuth";

export function AboutPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="profile-layout">
      <ProfileSideCard
        profile={toProfile(aboutData)}
        publishedCount={0}
        yearsCount={0}
        age={null}
        isOwn={false}
      />
      <div className="profile-center">
        <Card style={{ borderRadius: 0 }}>
          {/* TODO: 中间内容待设计 */}
        </Card>
      </div>
      <div className="profile-right-col">
        {user && (user.role === "admin" || user.role === "owner") && (
          <Button
            type="dashed"
            icon={<Edit3 size={14} />}
            onClick={() => navigate("/about/edit")}
            style={{ marginBottom: 16, width: "100%" }}
          >
            编辑关于页
          </Button>
        )}
      </div>
    </div>
  );
}
