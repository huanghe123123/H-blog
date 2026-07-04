import { Avatar, Card, Spin, Table, Typography } from "antd";
import { Wrench, Gamepad2, Lightbulb } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getLeaderboard, submitScore } from "../api/games";
import { useAuth } from "../hooks/useAuth";
import type { LeaderboardEntry } from "../types";

interface ToolItem {
  label: string;
  path: string;
  scored?: boolean;
  gameName?: string;
}

interface Category {
  key: string;
  label: string;
  icon: React.ReactNode;
  items: ToolItem[];
}

const CATEGORIES: Category[] = [
  {
    key: "工具",
    label: "实用工具",
    icon: <Wrench size={18} />,
    items: [
      { label: "Excel合并工具", path: "工具/Excel 多合一文件合并工具/Excel 多合一文件合并工具.html" },
      { label: "JSON解析工具", path: "工具/json格式转换.html" },
      { label: "Markdown预览器", path: "工具/markdown预览器.html" },
      { label: "二维码生成器", path: "工具/二维码生成器.html" },
      { label: "图片分割", path: "工具/图片分割.html" },
      { label: "图片加水印", path: "工具/图片加水印工具.html" },
      { label: "图片批量压缩", path: "工具/图片批量压缩工具/图片批量压缩工具.html" },
      { label: "小学数学出题器", path: "工具/小学数学自动出题器.html" },
    ],
  },
  {
    key: "游戏",
    label: "休闲游戏",
    icon: <Gamepad2 size={18} />,
    items: [
      { label: "2048", path: "游戏/2048.html", scored: true, gameName: "2048" },
      { label: "五子棋", path: "游戏/五子棋.html" },
      { label: "俄罗斯方块", path: "游戏/俄罗斯方块.html", scored: true, gameName: "tetris" },
      { label: "成语消消乐", path: "游戏/成语消消乐.html" },
      { label: "记忆翻牌", path: "游戏/记忆翻牌.html", scored: true, gameName: "memory" },
      { label: "贪吃蛇", path: "游戏/贪吃蛇.html", scored: true, gameName: "snake" },
    ],
  },
  {
    key: "教学",
    label: "教学演示",
    icon: <Lightbulb size={18} />,
    items: [
      { label: "光的折射与反射", path: "教学/光的折射和反射/光的折射与反射.html" },
      { label: "光的折射与反射2", path: "教学/光的折射和反射/光的折射与反射2.html" },
      { label: "单摆", path: "教学/单摆/单摆.html" },
      { label: "单摆(简版)", path: "教学/单摆/单摆-简版.html" },
    ],
  },
];

function isValidScoreMessage(data: unknown): data is { type: string; game: string; score: number } {
  return (
    typeof data === "object" && data !== null &&
    "type" in data && (data as Record<string, unknown>).type === "GAME_SCORE" &&
    "game" in data && typeof (data as Record<string, unknown>).game === "string" &&
    ["2048", "tetris", "memory", "snake"].includes((data as Record<string, unknown>).game as string) &&
    "score" in data && typeof (data as Record<string, unknown>).score === "number" &&
    (data as Record<string, unknown>).score as number >= 0
  );
}

export function ToolsPage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("工具");
  const [selectedItem, setSelectedItem] = useState<ToolItem | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const currentScoredItem = useMemo(
    () => (selectedItem?.scored ? selectedItem : null),
    [selectedItem],
  );

  // Fetch leaderboard when scored game changes
  useEffect(() => {
    if (currentScoredItem && user) {
      setLeaderboardLoading(true);
      getLeaderboard(currentScoredItem.gameName!)
        .then(setLeaderboard)
        .catch(() => setLeaderboard([]))
        .finally(() => setLeaderboardLoading(false));
    } else {
      setLeaderboard([]);
    }
  }, [currentScoredItem?.gameName, user]);

  // Listen for postMessage from game iframes
  const handleMessage = useCallback(async (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (!isValidScoreMessage(event.data)) return;
    if (!currentScoredItem || event.data.game !== currentScoredItem.gameName) return;
    if (!user) return;

    try {
      await submitScore(event.data.game, event.data.score);
      const data = await getLeaderboard(event.data.game);
      setLeaderboard(data);
    } catch {
      // silently ignore
    }
  }, [currentScoredItem, user]);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  const selectItem = (item: ToolItem, cat: Category) => {
    setSelectedCategory(cat.key);
    setSelectedItem(item);
    setIframeKey((k) => k + 1);
  };

  const leaderboardColumns = [
    {
      title: "排名",
      dataIndex: "rank",
      key: "rank",
      width: 56,
      render: (rank: number) => (
        <span style={{ fontWeight: rank <= 3 ? 700 : 400, color: rank <= 3 ? "#faad14" : undefined }}>
          {rank}
        </span>
      ),
    },
    {
      title: "玩家",
      dataIndex: "user",
      key: "user",
      render: (u: LeaderboardEntry["user"]) => (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Avatar src={u.avatar_url} size={22}>{u.nickname?.[0] || u.username[0]}</Avatar>
          <span>{u.nickname || u.username}</span>
        </span>
      ),
    },
    {
      title: "分数",
      dataIndex: "score",
      key: "score",
      width: 80,
      render: (s: number) => <span style={{ fontWeight: 600 }}>{s.toLocaleString()}</span>,
    },
    {
      title: "时间",
      dataIndex: "created_at",
      key: "created_at",
      width: 100,
      render: (d: string) => new Date(d).toLocaleDateString("zh-CN"),
    },
  ];

  return (
    <div className="tools-layout">
      {/* Left Sidebar — Category Navigation */}
      <aside className="tools-left">
        <Card title="分类导航" className="side-card" size="small">
          {CATEGORIES.map((cat) => (
            <div key={cat.key} style={{ marginBottom: 4 }}>
              <div
                className={`tools-category-header${selectedCategory === cat.key ? " active" : ""}`}
                onClick={() => setSelectedCategory(cat.key)}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </div>
              {selectedCategory === cat.key && (
                <div>
                  {cat.items.map((item) => (
                    <div
                      key={item.label}
                      className={`tools-subitem${selectedItem?.label === item.label ? " active" : ""}`}
                      onClick={() => selectItem(item, cat)}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Card>
      </aside>

      {/* Center — iframe */}
      <main className="tools-center">
        {selectedItem ? (
          <iframe
            key={iframeKey}
            src={`/AI-MiniProgram/${selectedItem.path}`}
            className="tools-iframe"
            title={selectedItem.label}
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="tools-placeholder">
            <Typography.Text type="secondary" style={{ fontSize: 16 }}>
              请从左侧选择一个工具或游戏
            </Typography.Text>
          </div>
        )}
      </main>

      {/* Right Sidebar — Leaderboard */}
      <aside className="tools-right">
        {currentScoredItem ? (
          <Card
            title={`🏆 ${currentScoredItem.label} 排行榜`}
            className="side-card"
            size="small"
          >
            {user ? (
              leaderboardLoading ? (
                <div style={{ textAlign: "center", padding: 24 }}><Spin /></div>
              ) : leaderboard.length > 0 ? (
                <Table
                  dataSource={leaderboard}
                  columns={leaderboardColumns}
                  rowKey="rank"
                  size="small"
                  pagination={false}
                  scroll={{ y: 400 }}
                />
              ) : (
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  暂无记录，快来玩一局吧！
                </Typography.Text>
              )
            ) : (
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                请先登录以查看排行榜
              </Typography.Text>
            )}
          </Card>
        ) : null}
      </aside>
    </div>
  );
}
