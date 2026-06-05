import { Input, Modal } from "antd";
import { useEffect, useState } from "react";
import type { UserLink } from "../types";

const COMMON_ICONS = [
  // 品牌
  "fa-brands fa-github", "fa-brands fa-gitlab", "fa-brands fa-git", "fa-brands fa-stack-overflow",
  "fa-brands fa-docker", "fa-brands fa-python", "fa-brands fa-js", "fa-brands fa-react",
  "fa-brands fa-vuejs", "fa-brands fa-angular", "fa-brands fa-node", "fa-brands fa-npm",
  "fa-brands fa-linux", "fa-brands fa-apple", "fa-brands fa-windows", "fa-brands fa-android",
  "fa-brands fa-aws", "fa-brands fa-google", "fa-brands fa-microsoft", "fa-brands fa-youtube",
  "fa-brands fa-twitter", "fa-brands fa-discord", "fa-brands fa-telegram", "fa-brands fa-reddit",
  "fa-brands fa-instagram", "fa-brands fa-facebook", "fa-brands fa-tiktok", "fa-brands fa-spotify",
  "fa-brands fa-steam", "fa-brands fa-twitch", "fa-brands fa-codepen", "fa-brands fa-css3-alt",
  "fa-brands fa-html5", "fa-brands fa-markdown", "fa-brands fa-rust", "fa-brands fa-java",
  "fa-brands fa-laravel", "fa-brands fa-php", "fa-brands fa-swift", "fa-brands fa-figma",
  // 通用
  "fa-solid fa-globe", "fa-solid fa-link", "fa-solid fa-envelope", "fa-solid fa-phone",
  "fa-solid fa-location-dot", "fa-solid fa-house", "fa-solid fa-blog", "fa-solid fa-newspaper",
  "fa-solid fa-book", "fa-solid fa-code", "fa-solid fa-terminal", "fa-solid fa-server",
  "fa-solid fa-database", "fa-solid fa-cloud", "fa-solid fa-image", "fa-solid fa-video",
  "fa-solid fa-music", "fa-solid fa-crown", "fa-solid fa-star", "fa-solid fa-heart",
  "fa-solid fa-fire", "fa-solid fa-bolt", "fa-solid fa-gem", "fa-solid fa-certificate",
  "fa-solid fa-graduation-cap", "fa-solid fa-briefcase", "fa-solid fa-comment", "fa-solid fa-paper-plane",
  // 社交国内
  "fa-brands fa-weixin", "fa-brands fa-weibo", "fa-brands fa-qq", "fa-brands fa-alipay",
  "fa-solid fa-comments", "fa-solid fa-address-book",
];

interface LinkEditorModalProps {
  open: boolean;
  initial?: UserLink | null;
  onSave: (link: UserLink) => void;
  onCancel: () => void;
}

export function LinkEditorModal({ open, initial, onSave, onCancel }: LinkEditorModalProps) {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("fa-solid fa-link");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      if (initial) {
        setUrl(initial.url);
        setLabel(initial.label);
        setIcon(initial.icon);
      } else {
        setUrl("");
        setLabel("");
        setIcon("fa-solid fa-link");
      }
      setSearch("");
    }
  }, [open, initial]);

  const filteredIcons = search.trim()
    ? COMMON_ICONS.filter((i) => i.toLowerCase().includes(search.toLowerCase()))
    : COMMON_ICONS;

  const normalizeUrl = (raw: string): string => {
    const u = raw.trim();
    if (!u) return u;
    if (/^https?:\/\//i.test(u) || u.startsWith("mailto:") || u.startsWith("/")) return u;
    return "https://" + u;
  };

  const handleSave = () => {
    if (!url.trim() || !label.trim()) return;
    onSave({ url: normalizeUrl(url), label: label.trim(), icon });
  };

  return (
    <Modal
      title={initial ? "编辑链接" : "添加链接"}
      open={open}
      onCancel={onCancel}
      onOk={handleSave}
      okText="保存"
      cancelText="取消"
      okButtonProps={{ disabled: !url.trim() || !label.trim() }}
      destroyOnClose
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>链接 URL</div>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." maxLength={500} />
        </div>
        <div>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>描述</div>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="GitHub、邮箱、个人博客..." maxLength={50} />
        </div>
        <div>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>
            图标
            {icon && (
              <span style={{ marginLeft: 10, fontSize: 20, verticalAlign: "middle" }}>
                <i className={icon} />
              </span>
            )}
          </div>
          <Input placeholder="搜索图标..." value={search} onChange={(e) => setSearch(e.target.value)} allowClear style={{ marginBottom: 8 }} />
          <div className="link-editor-icon-grid">
            {filteredIcons.map((name) => (
              <button
                key={name}
                type="button"
                className={`link-editor-icon-btn${icon === name ? " selected" : ""}`}
                title={name}
                onClick={() => setIcon(name)}
              >
                <i className={name} style={{ fontSize: 20 }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
