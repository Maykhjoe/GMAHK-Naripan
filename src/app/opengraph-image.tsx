import { ImageResponse } from "next/og";

import { getSiteConfig } from "@/lib/data/site-settings";

export const alt = "GMAHK Naripan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 60;

export default async function Image() {
  const site = await getSiteConfig();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#26352B",
          color: "white",
        }}
      >
        <div
          style={{
            fontSize: 22,
            letterSpacing: "4px",
            color: "#C8A96B",
            textTransform: "uppercase",
          }}
        >
          Selamat Datang di
        </div>
        <div
          style={{
            fontSize: 68,
            lineHeight: 1.05,
            maxWidth: "950px",
            marginTop: "30px",
            fontWeight: 600,
          }}
        >
          {site.name}
        </div>
        <div
          style={{
            width: "110px",
            height: "3px",
            background: "#C8A96B",
            marginTop: "40px",
          }}
        />
        <div
          style={{
            fontSize: 24,
            color: "#cbd5ce",
            marginTop: "25px",
          }}
        >
          {site.slogan}
        </div>
      </div>
    ),
    size,
  );
}
