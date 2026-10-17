import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0F172A",
          borderRadius: "8px",
          border: "1px solid rgba(99, 102, 241, 0.4)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Top notice text lines */}
          <path d="M8 14H16" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M8 22H14" stroke="#A5B4FC" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 30H16" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" />

          {/* Upper Timeline Bar (Indigo) */}
          <rect x="18" y="11" width="22" height="7.5" rx="3.75" fill="#4F46E5" />

          {/* Lower Timeline Bar (Violet) */}
          <rect x="15" y="24" width="25" height="7.5" rx="3.75" fill="#7C3AED" />

          {/* Conflict Clash Diamond (Crimson) */}
          <g transform="translate(27, 21.5)">
            <polygon points="0,-5 5,0 0,5 -5,0" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.2" />
            <circle cx="0" cy="0" r="1.2" fill="#FFFFFF" />
          </g>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
