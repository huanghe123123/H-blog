import { api } from "./client";

export type SiteConfig = {
  site_name: string;
  site_description: string;
  site_owner: number;
  site_name_color: string;
  site_description_color: string;
  primary_color: string;
  border_radius: number;
  locale: string;
  home: {
    greeting_enabled: boolean;
    tagline: string;
  };
  features: {
    email_verification: boolean;
    comments: boolean;
    likes: boolean;
  };
};

export async function fetchSiteConfig(): Promise<SiteConfig> {
  const { data } = await api.get<SiteConfig>("/config");
  return data;
}
