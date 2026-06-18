import React from "react";
import ReactDOM from "react-dom/client";
import "antd/dist/reset.css";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import "./styles.css";
import App from "./App";
import { loadOml2d } from "oh-my-live2d";

loadOml2d({
  dockedPosition: "left",
  primaryColor: "#49B1F5",
  stageStyle: {
    bottom: "56px",
    width: 360,
    height: 220,
    // 「美水かがみ劇場」葡萄藤画框：铺满舞台，看板娘在框内"演出"
    background: "url(/live2d/stage-frame.png) center/100% 100% no-repeat",
    boxShadow: "0 10px 30px -10px rgba(16, 24, 40, 0.22)",
  },
  models: [
    {
      path: "/live2d/konata/泉此方.model3.json",
      scale: 0.13,
      position: [0, 0],
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
  mobileDisplay: false,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
