import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt =
  "Signet - copy-paste React components for the moments after the click";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social share card: the product's dark-emerald identity + the pitch. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "radial-gradient(1000px 500px at 80% -10%, rgba(52,211,153,0.16), transparent 60%), #0c0e12",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 22,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#34d399",
            }}
          >
            <span style={{ color: "#34d399" }}>◇</span>
            <span>Signet · the moments after the click</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 78,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              color: "#f7f7f7",
              maxWidth: 960,
            }}
          >
            The missing UX layer for Solana dApps
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              lineHeight: 1.4,
              color: "#94969c",
              maxWidth: 900,
            }}
          >
            Copy-paste React components for transaction status, signing review,
            wallet connect, fees and error states.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {["copy-paste · no install", "MIT", "React + Tailwind + lucide-react"].map(
            (chip) => (
              <div
                key={chip}
                style={{
                  display: "flex",
                  padding: "10px 20px",
                  border: "1px solid #22262f",
                  borderRadius: 10,
                  fontSize: 22,
                  color: "#cecfd2",
                  fontFamily: "monospace",
                }}
              >
                {chip}
              </div>
            ),
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
