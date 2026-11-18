import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg"],
  async headers() {
    // iOS öppnar en .shortcut i Genvägar bara om filen serveras med rätt typ.
    return [
      {
        source: "/shortcuts/:file*.shortcut",
        headers: [
          { key: "Content-Type", value: "application/vnd.apple.shortcut" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
