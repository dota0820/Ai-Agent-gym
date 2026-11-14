import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "练练 · AI 健身教练",
    short_name: "练练",
    description: "给健身新手的 AI 教练",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f6fc",
    theme_color: "#f2f6fc",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
