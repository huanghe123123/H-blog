import React from "react";
import ReactDOM from "react-dom/client";
import "antd/dist/reset.css";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import "./styles.css";
import App from "./App";
import { loadOml2d } from "oh-my-live2d";

const oml2d = loadOml2d({
  primaryColor: "#49B1F5",
  stageStyle: {
    bottom: "-50px",
    right: "100px",
    width: 320,
    height: 480,
  },
  models: [
    {
      path: "/live2d/xiaoyue/xiaoyue.model3.json",
      scale: 0.06,
      position: [0, 100],
      stageStyle: { left: "200px" },
    },
  ],
  tips: {
    welcomeTips: {
      message: {
        daybreak: "早上好呀~ 一日之计在于晨！",
        morning: "上午好！工作再忙也要记得喝水哦~",
        noon: "中午啦！该吃饭了，别饿着肚子写代码！",
        afternoon: "午后容易犯困呢，来杯咖啡提提神吧~",
        dusk: "傍晚了！今天辛苦啦，起来活动一下吧~",
        night: "晚上好！今天的 bug 都修完了吗？",
        lateNight: "已经很晚了呢，早点休息吧，晚安~",
        weeHours: "这么晚还不睡？！当心明天起不来哦！",
      },
    },
  },
  menus: {
    items: (defaultItems) => [
      ...defaultItems,
      {
        id: "ai-chat",
        icon: "💬",
        title: "AI 对话",
        onClick: () => {
          window.dispatchEvent(new CustomEvent("toggle-agent-chat"));
        },
      },
    ],
  },
  mobileDisplay: false,
});

// Expose oml2d instance globally for AgentChat component
(window as unknown as Record<string, unknown>).__oml2d = oml2d;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
