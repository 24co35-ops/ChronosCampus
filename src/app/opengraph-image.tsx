import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 80px",
          backgroundColor: "#0B0F19",
          backgroundImage:
            "radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.18) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(124, 58, 237, 0.15) 0%, transparent 50%)",
          color: "#FFFFFF",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle background grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Header / Brand Mark Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            
          }}
        >
          {/* Logo Mark + Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "18px",
                backgroundColor: "#1E1B4B",
                border: "2px solid #6366F1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 25px rgba(99, 102, 241, 0.4)",
              }}
            >
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path d="M8 14H16" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M8 22H14" stroke="#A5B4FC" strokeWidth="2" strokeLinecap="round" />
                <path d="M8 30H16" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" />
                <rect x="18" y="11" width="22" height="7.5" rx="3.75" fill="#4F46E5" />
                <rect x="15" y="24" width="25" height="7.5" rx="3.75" fill="#7C3AED" />
                <g transform="translate(27, 21.5)">
                  <polygon points="0,-5 5,0 0,5 -5,0" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.2" />
                  <circle cx="0" cy="0" r="1.2" fill="#FFFFFF" />
                </g>
              </svg>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "32px", fontWeight: 900, letterSpacing: "-0.5px" }}>
                  Chronos<span style={{ color: "#818CF8" }}>Campus</span>
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    backgroundColor: "rgba(99, 102, 241, 0.2)",
                    border: "1px solid rgba(129, 140, 248, 0.4)",
                    color: "#A5B4FC",
                    padding: "4px 12px",
                    borderRadius: "20px",
                  }}
                >
                  SETU 2026 • PS-02
                </span>
              </div>
              <span style={{ fontSize: "15px", color: "#94A3B8", fontWeight: 500 }}>
                Academic Notice Decoder & Timetable Collision Resolver
              </span>
            </div>
          </div>

          {/* Zero-Latency Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "24px",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(52, 211, 153, 0.4)",
              color: "#6EE7B7",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#10B981",
              }}
            />
            <span>⚡ 1.2ms Deterministic Engine</span>
          </div>
        </div>

        {/* Center Main Hero Typography */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px",  }}>
          <h1
            style={{
              fontSize: "58px",
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: "-1.5px",
              color: "#FFFFFF",
              maxWidth: "1000px",
              margin: 0,
            }}
          >
            Turn chaotic college notices into conflict-free calendars in 1.2ms.
          </h1>
          <p
            style={{
              fontSize: "24px",
              color: "#CBD5E1",
              lineHeight: 1.4,
              maxWidth: "880px",
              margin: 0,
            }}
          >
            Deterministic Indian date/time parsing, interval clash algebra, compound busy-block
            detection, and instant RFC-5545 calendar stream export.
          </p>
        </div>

        {/* Bottom Feature Badges & Visual Pills */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            
          }}
        >
          {/* Feature Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "12px",
                backgroundColor: "rgba(99, 102, 241, 0.15)",
                border: "1px solid rgba(129, 140, 248, 0.3)",
                color: "#C7D2FE",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              <span>⚡ Hybrid Neuro-Symbolic Engine</span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "12px",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(248, 113, 113, 0.3)",
                color: "#FECACA",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              <span>🛡 3-Tier Clash Solver</span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "12px",
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(52, 211, 153, 0.3)",
                color: "#A7F3D0",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              <span>📅 RFC-5545 .ics Export</span>
            </div>
          </div>

          {/* Regional & Format Support Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94A3B8", fontSize: "14px", fontWeight: 600 }}>
            <span>🇮🇳 DD/MM/YYYY • Hinglish Ready • 100% Offline Core</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
