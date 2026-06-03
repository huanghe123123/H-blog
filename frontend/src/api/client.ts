import axios from "axios";

export const TOKEN_KEY = "blog_access_token";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
