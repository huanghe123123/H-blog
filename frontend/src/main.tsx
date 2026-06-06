import React from "react";
import ReactDOM from "react-dom/client";
import "antd/dist/reset.css";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import "./styles.css";
import App from "./App";

// Restore path after 404.html redirect (GitHub Pages SPA fallback)
const saved = sessionStorage.getItem("redirect");
if (saved) {
  sessionStorage.removeItem("redirect");
  const u = new URL(saved);
  history.replaceState(null, "", u.pathname + u.search + u.hash);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
