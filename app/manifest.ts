import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Calorie Chat",
    short_name: "Calorie Chat",
    description: "Log meals by talking. Track calories, weight, and your goal.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#edeade",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
