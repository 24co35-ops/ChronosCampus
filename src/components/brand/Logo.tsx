"use client";

import React from "react";

export type LogoVariant = "full" | "mark" | "monochrome";
export type LogoSize = "sm" | "md" | "lg";

export interface LogoProps extends React.SVGProps<SVGSVGElement> {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  showBadge?: boolean;
  badgeText?: string;
}

const SIZE_CONFIG: Record<
  LogoSize,
  {
    markSize: number;
    titleClass: string;
    subClass: string;
    gapClass: string;
  }
> = {
  sm: {
    markSize: 26,
    titleClass: "text-xs font-bold",
    subClass: "text-[9px]",
    gapClass: "gap-2",
  },
  md: {
    markSize: 36,
    titleClass: "text-sm sm:text-base font-extrabold",
    subClass: "text-[11px]",
    gapClass: "gap-2.5",
  },
  lg: {
    markSize: 48,
    titleClass: "text-lg sm:text-xl font-black",
    subClass: "text-xs",
    gapClass: "gap-3",
  },
};

/**
 * ChronosCampus Vector Brand Mark (PS-02 Problem Statement Metaphor)
 *
 * 1. Left side: Three chaotic, staggered lines of raw campus notice text.
 * 2. Center/Right: Two smooth, rounded horizontal calendar timeline bars (#4F46E5 & #7C3AED).
 * 3. Overlap & Conflict: A sharp crimson diamond marker (#EF4444) highlighting the point-in-time
 *    deadline collision detector.
 */
export function LogoMark({
  size = "md",
  monochrome = false,
  className = "",
  ...svgProps
}: {
  size?: LogoSize;
  monochrome?: boolean;
  className?: string;
} & React.SVGProps<SVGSVGElement>) {
  const pixelSize = SIZE_CONFIG[size].markSize;

  // Color tokens
  const bgFill = monochrome ? "currentColor" : "url(#cc-mark-bg-grad)";
  const line1Color = monochrome ? "currentColor" : "#818CF8";
  const line2Color = monochrome ? "currentColor" : "#A5B4FC";
  const bar1Color = monochrome ? "currentColor" : "url(#cc-bar-primary)";
  const bar2Color = monochrome ? "currentColor" : "url(#cc-bar-secondary)";
  const clashDiamondColor = monochrome ? "currentColor" : "#EF4444";
  const clashGlowColor = monochrome ? "currentColor" : "rgba(239, 68, 68, 0.45)";

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="ChronosCampus Brand Mark"
      role="img"
      {...svgProps}
    >
      <defs>
        {/* Rounded square container gradient */}
        <linearGradient id="cc-mark-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E1B4B" />
          <stop offset="50%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>

        {/* Primary Timeline Bar (Internal Test #4F46E5) */}
        <linearGradient id="cc-bar-primary" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>

        {/* Secondary Timeline Bar (Guest Lecture #7C3AED) */}
        <linearGradient id="cc-bar-secondary" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9333EA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>

        {/* Subtle ambient border glow */}
        <linearGradient id="cc-mark-border" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818CF8" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.2" />
        </linearGradient>

        {/* Crimson collision glow filter */}
        <filter id="cc-diamond-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#EF4444" floodOpacity="0.8" />
        </filter>
      </defs>

      {/* 1. App Icon Rounded Container */}
      <rect
        x="1.5"
        y="1.5"
        width="45"
        height="45"
        rx="12"
        fill={bgFill}
        stroke={monochrome ? "currentColor" : "url(#cc-mark-border)"}
        strokeWidth="1.5"
      />

      {/* 2. Left Side: Unstructured Messy Notice Text Lines transforming into order */}
      {/* Top jagged notice line */}
      <path
        d="M9 13.5H16.5M19 13.5H22"
        stroke={line1Color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.75"
      />
      {/* Middle notice line */}
      <path
        d="M9 20H15M17.5 20H19.5"
        stroke={line2Color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeOpacity="0.6"
      />
      {/* Bottom notice line */}
      <path
        d="M9 26.5H13.5M16 26.5H20"
        stroke={line1Color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeOpacity="0.75"
      />

      {/* 3. Center/Right: Clean Horizontal Calendar Timeline Bars */}
      {/* Upper Timeline Bar (e.g. Internal Test: 10:00 - 11:30 AM) */}
      <rect
        x="20"
        y="12"
        width="19"
        height="6.5"
        rx="3.25"
        fill={bar1Color}
      />
      {/* Inner tick lines representing calendar hour divisions */}
      <line x1="26.5" y1="13.5" x2="26.5" y2="17" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="1" strokeLinecap="round" />
      <line x1="33" y1="13.5" x2="33" y2="17" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="1" strokeLinecap="round" />

      {/* Lower Timeline Bar (e.g. Guest Lecture: 11:00 AM - 12:30 PM) */}
      <rect
        x="17"
        y="23.5"
        width="22"
        height="6.5"
        rx="3.25"
        fill={bar2Color}
      />
      {/* Inner tick lines */}
      <line x1="24.5" y1="25" x2="24.5" y2="28.5" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="1" strokeLinecap="round" />
      <line x1="32" y1="25" x2="32" y2="28.5" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="1" strokeLinecap="round" />

      {/* 4. Conflict Zone & Trapped Deadline Diamond Marker */}
      {/* Vertical dotted collision projection line through overlap zone */}
      <line
        x1="28.5"
        y1="12"
        x2="28.5"
        y2="30"
        stroke={clashGlowColor}
        strokeWidth="1"
        strokeDasharray="1.5 1.5"
      />

      {/* Sharp Crimson Diamond Clash Detector (Rotated square at intersection) */}
      <g transform="translate(28.5, 21)">
        <polygon
          points="0,-4.5 4.5,0 0,4.5 -4.5,0"
          fill={clashDiamondColor}
          stroke="#FFFFFF"
          strokeWidth="1.2"
          filter="url(#cc-diamond-glow)"
        />
        {/* Core point indicator */}
        <circle cx="0" cy="0" r="1.2" fill="#FFFFFF" />
      </g>

      {/* 5. Minimal Sparkle indicator of instant 0ms deterministic resolution */}
      <path
        d="M39.5 9L40.2 10.8L42 11.5L40.2 12.2L39.5 14L38.8 12.2L37 11.5L38.8 10.8L39.5 9Z"
        fill={monochrome ? "currentColor" : "#FBBF24"}
      />
    </svg>
  );
}

/**
 * Cohesive Brand Logo Component
 * Supports:
 * - variant="full" | "mark" | "monochrome"
 * - size="sm" | "md" | "lg"
 */
export function Logo({
  variant = "full",
  size = "md",
  className = "",
  showBadge = true,
  badgeText = "PS-02 Solution",
  ...props
}: LogoProps) {
  const cfg = SIZE_CONFIG[size];
  const isMonochrome = variant === "monochrome";

  if (variant === "mark") {
    return <LogoMark size={size} monochrome={isMonochrome} className={className} {...props} />;
  }

  return (
    <div className={`inline-flex items-center ${cfg.gapClass} select-none ${className}`}>
      {/* 1. Vector Mark */}
      <LogoMark size={size} monochrome={isMonochrome} {...props} />

      {/* 2. Brand Wordmark & Metainfo */}
      <div className="flex flex-col min-w-0 leading-tight">
        <div className="flex items-center gap-2">
          <span
            className={`${cfg.titleClass} tracking-tight ${
              isMonochrome
                ? "text-current"
                : "text-slate-900 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 bg-clip-text text-transparent"
            }`}
          >
            Chronos<span className={isMonochrome ? "text-current" : "text-indigo-600"}>Campus</span>
          </span>

          {showBadge && (
            <span
              className={`hidden xs:inline-flex items-center font-bold uppercase rounded-full ${
                isMonochrome
                  ? "border border-current px-1.5 py-0.5 text-[8px]"
                  : "bg-indigo-50 text-indigo-700 border border-indigo-200/90 px-2 py-0.5 text-[9px] shadow-2xs"
              }`}
            >
              {badgeText}
            </span>
          )}
        </div>

        <p
          className={`${cfg.subClass} font-medium truncate ${
            isMonochrome ? "text-current opacity-75" : "text-slate-500"
          }`}
        >
          Notice Decoder • Conflict-Free Schedules
        </p>
      </div>
    </div>
  );
}

export default Logo;
