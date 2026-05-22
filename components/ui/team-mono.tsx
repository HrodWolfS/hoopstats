"use client";

import { useState } from "react";
import Image from "next/image";
import { readable } from "@/lib/color";

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "hero";

type TeamMonoProps = {
  abbr: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string | null;
  size?: Size;
  className?: string;
};

const SIZES: Record<Size, { box: string; px: number; text: string }> = {
  xs: { box: "h-8 w-8 text-[10px] rounded-md", px: 32, text: "text-[10px]" },
  sm: { box: "h-10 w-10 text-[11px] rounded-lg", px: 40, text: "text-[11px]" },
  md: { box: "h-14 w-14 text-[13px] rounded-xl", px: 56, text: "text-[13px]" },
  lg: { box: "h-24 w-24 text-xl rounded-2xl", px: 96, text: "text-xl" },
  xl: { box: "h-40 w-40 text-5xl rounded-3xl", px: 160, text: "text-5xl" },
  hero: {
    box: "h-56 w-56 text-7xl rounded-[28px]",
    px: 224,
    text: "text-7xl",
  },
};

/** Padding relatif au conteneur pour chaque taille (logo centré avec espace) */
const LOGO_PADDING: Record<Size, string> = {
  xs: "p-1",
  sm: "p-1.5",
  md: "p-2",
  lg: "p-3",
  xl: "p-4",
  hero: "p-6",
};

export function TeamMono({
  abbr,
  primaryColor,
  secondaryColor,
  logoUrl,
  size = "md",
  className = "",
}: TeamMonoProps) {
  const [imgError, setImgError] = useState(false);

  const s = SIZES[size];
  const fg = readable(secondaryColor);
  const useLogo = !!logoUrl && !imgError;

  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center font-display font-bold tracking-tight select-none ${s.box} ${className}`}
      style={
        useLogo
          ? { background: "#0A0A0B" }
          : {
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
              color: fg,
            }
      }
    >
      {useLogo ? (
        <div className={`relative w-full h-full ${LOGO_PADDING[size]}`}>
          <Image
            src={logoUrl}
            alt={abbr}
            width={s.px}
            height={s.px}
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
            unoptimized
          />
        </div>
      ) : (
        <>
          {/* subtle grid noise */}
          <div
            className="absolute inset-0 opacity-[0.08] pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 8px)",
            }}
          />
          <span className={`relative ${s.text}`}>{abbr}</span>
        </>
      )}
    </div>
  );
}
