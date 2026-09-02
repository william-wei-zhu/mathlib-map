import { ImageResponse } from "next/og";
import { LogoOg } from "@/lib/logo-og";

export const alt = "Mathlib Map";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Logo only, sized to fill the frame height. The words live in the share text.
export default function OpengraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#fbfaf7" }}>
      <LogoOg size={540} />
    </div>,
    size,
  );
}
