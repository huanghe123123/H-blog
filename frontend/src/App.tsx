import { ConfigProvider, App as AntApp, Spin } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { fetchSiteConfig, type SiteConfig } from "./api/config";
import { AuthProvider } from "./hooks/useAuth";
import { router } from "./router";

export default function App() {
  const [config, setConfig] = useState<SiteConfig | null>(null);

  useEffect(() => {
    fetchSiteConfig().then((cfg) => {
      document.title = cfg.site_name;
      setConfig(cfg);
    });
  }, []);

  if (!config) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ConfigProvider
      locale={config.locale === "zh-CN" ? zhCN : undefined}
      theme={{
        token: {
          borderRadius: config.border_radius,
          colorPrimary: "#49B1F5",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Lato, Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif",
          colorBgLayout: "#f7f9fe",
          colorBgContainer: "#ffffff",
          colorBorderSecondary: "#e8eaed",
        }
      }}
    >
      <AntApp>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}
