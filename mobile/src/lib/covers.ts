import { webOrigin } from "@/config/firebase";

// The website stores covers as "/images/<name>.jpg" (files hosted with the site).
// They are bundled here so they load instantly and offline, and stay compatible with the web data.
const bundled: Record<string, number> = {
  "/images/community.jpg": require("../../assets/covers/community.jpg"),
  "/images/night-market.jpg": require("../../assets/covers/night-market.jpg"),
  "/images/live-music.jpg": require("../../assets/covers/live-music.jpg"),
  "/images/food-market.jpg": require("../../assets/covers/food-market.jpg"),
  "/images/tech-workshop.jpg": require("../../assets/covers/tech-workshop.jpg"),
  "/images/pottery-workshop.jpg": require("../../assets/covers/pottery-workshop.jpg"),
  "/images/pottery-workshop-v2.jpg": require("../../assets/covers/pottery-workshop-v2.jpg"),
};

export type CoverSource = number | { uri: string };

export function coverSource(path?: string | null): CoverSource {
  const value = (path || "").trim();
  if (!value) return bundled["/images/community.jpg"];
  if (bundled[value]) return bundled[value];
  if (/^https?:\/\//i.test(value)) return { uri: value };
  if (value.startsWith("/")) return { uri: `${webOrigin}${value}` };
  return bundled["/images/community.jpg"];
}

export const COVER_OPTIONS = [
  { label: "Community", value: "/images/community.jpg" },
  { label: "Live music", value: "/images/night-market.jpg" },
  { label: "Workshop", value: "/images/pottery-workshop-v2.jpg" },
  { label: "Food", value: "/images/food-market.jpg" },
  { label: "Tech", value: "/images/tech-workshop.jpg" },
];
