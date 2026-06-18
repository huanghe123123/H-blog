import { Badge, Button, message } from "antd";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { getLikeStatus, like, unlike } from "../api/likes";
import { useAuth } from "../hooks/useAuth";

export function LikeButton({ targetType, targetId, shape, size }: { targetType: "post" | "comment"; targetId: number; shape?: "circle"; size?: "small" }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);

  const load = async () => {
    const result = await getLikeStatus(targetType, targetId);
    setLiked(result.liked);
    setCount(result.count);
  };

  useEffect(() => {
    void load();
  }, [targetType, targetId]);

  const toggle = async () => {
    if (!user) {
      message.warning("请先登录");
      return;
    }
    try {
      if (liked) {
        await unlike(targetType, targetId);
      } else {
        await like(targetType, targetId);
      }
      await load();
    } catch {
      message.error("操作失败");
    }
  };

  if (shape === "circle") {
    return (
      <Badge count={count} size="small" color="#49B1F5" offset={[-4, 4]}>
        <Button shape="circle" size={size} type={liked ? "primary" : "default"} icon={<Heart size={size === "small" ? 14 : 16} />} onClick={toggle} />
      </Badge>
    );
  }

  return (
    <Button type={liked ? "primary" : "default"} icon={<Heart size={16} />} onClick={toggle}>
      {count}
    </Button>
  );
}
