import { ImageResponse } from "next/og";
import type { OpenGraphContent } from "./open-graph";

export const openGraphImageSize = { width: 1200, height: 630 };

export function createContentOpenGraphImage(content: OpenGraphContent) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: "#26352B",
        color: "#FFFFFF",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          width: "76%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 24px 68px 78px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", color: "#C8A96B", fontSize: 22, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase" }}>
          <div style={{ width: 52, height: 3, marginRight: 18, backgroundColor: "#C8A96B" }} />
          {content.eyebrow}
        </div>
        <div style={{ display: "flex", marginTop: 30, maxWidth: 850, fontSize: 68, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
          {content.title}
        </div>
        <div style={{ display: "flex", marginTop: 28, maxWidth: 820, color: "#DCE3DE", fontSize: 25, lineHeight: 1.45 }}>
          {content.description}
        </div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 48, color: "#AEBBB2", fontSize: 20, fontWeight: 600, letterSpacing: 1.5 }}>
          GMAHK NARIPAN · BERSAMA DALAM KRISTUS
        </div>
      </div>

      <div style={{ width: "24%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", backgroundColor: "#31463A" }}>
        <div style={{ width: 390, height: 390, display: "flex", position: "absolute", border: "2px solid rgba(200,169,107,.28)", borderRadius: 999, right: -115, top: 110 }} />
        <div style={{ width: 280, height: 280, display: "flex", position: "absolute", border: "2px solid rgba(200,169,107,.16)", borderRadius: 999, right: -60, top: 165 }} />
        <div style={{ width: 28, height: 245, display: "flex", position: "absolute", backgroundColor: "#C8A96B", borderRadius: 4, right: 126, top: 178 }} />
        <div style={{ width: 150, height: 28, display: "flex", position: "absolute", backgroundColor: "#C8A96B", borderRadius: 4, right: 65, top: 235 }} />
      </div>

      <div style={{ width: 10, height: "100%", display: "flex", position: "absolute", left: 0, top: 0, backgroundColor: "#C8A96B" }} />
    </div>,
    openGraphImageSize,
  );
}
