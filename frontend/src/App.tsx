import { ConfigProvider, App as AntApp, Spin } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { fetchSiteConfig, type SiteConfig } from "./api/config";
import { AuthProvider } from "./hooks/useAuth";
import { router } from "./router";

export default function App() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchSiteConfig().then((cfg) => {
      document.title = cfg.site_name;
      setConfig(cfg);
    }).catch(() => {
      setError(true);
    });
  }, []);

  if (error) {
    // Fallback: use defaults if config endpoint is unreachable
    const fallback: SiteConfig = {
      site_name: "Blog",
      site_description: "",
      site_owner: 0,
      site_name_color: "#1f2d3d",
      site_description_color: "#6c757e",
      primary_color: "#1f6feb",
      border_radius: 6,
      locale: "zh-CN",
      features: { email_verification: true, comments: true, likes: true },
    };
    return renderApp(fallback);
  }

  if (!config) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Spin size="large" />
      </div>
    );
  }

  return renderApp(config);
}

function renderApp(config: SiteConfig) {
  return (
    <ConfigProvider
      locale={config.locale === "zh-CN" ? zhCN : undefined}
      theme={{
        token: {
          borderRadius: config.border_radius,
          colorPrimary: "#49B1F5",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Lato, Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif",
          colorBgLayout: "#f0f2f5",
          colorBgContainer: "#fafbfd",
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
