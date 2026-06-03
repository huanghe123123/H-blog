import { api } from "./client";

export type SiteConfig = {
  site_name: string;
  site_description: string;
  primary_color: string;
  border_radius: number;
  locale: string;
  features: {
    email_verification: boolean;
    comments: boolean;
    likes: boolean;
  };
};

let cached: SiteConfig | null = null;

export async function fetchSiteConfig(): Promise<SiteConfig> {
  if (cached) return cached;
  const { data } = await api.get<SiteConfig>("/config");
  cached = data;
  return data;
}
