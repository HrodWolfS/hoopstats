import Image from "next/image";
import { readable } from "@/lib/color";

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "hero";

type PlayerAvatarProps = {
  firstName: string;
  lastName: string;
  primaryColor?: string;
  secondaryColor?: string;
  jerseyNumber?: string | null;
  photoUrl?: string | null;
  size?: Size;
  showNum?: boolean;
  className?: string;
};

const SIZES: Record<
  Size,
  { box: string; px: number; text: string; num: string }
> = {
  xs: {
    box: "h-8 w-8",
    px: 32,
    text: "text-[10px]",
    num: "text-[8px] -bottom-0.5 -right-0.5 h-3.5 w-3.5",
  },
  sm: {
    box: "h-10 w-10",
    px: 40,
    text: "text-xs",
    num: "text-[9px] -bottom-1 -right-1 h-4 w-4",
  },
  md: {
    box: "h-14 w-14",
    px: 56,
    text: "text-base",
    num: "text-[10px] -bottom-1 -right-1 h-5 w-5",
  },
  lg: {
    box: "h-20 w-20",
    px: 80,
    text: "text-xl",
    num: "text-[11px] -bottom-1 -right-1 h-6 w-6",
  },
  xl: {
    box: "h-32 w-32",
    px: 128,
    text: "text-4xl",
    num: "text-sm -bottom-1.5 -right-1.5 h-9 w-9",
  },
  hero: {
    box: "h-56 w-56",
    px: 224,
    text: "text-7xl",
    num: "text-2xl -bottom-3 -right-3 h-16 w-16",
  },
};

export function PlayerAvatar({
  firstName,
  lastName,
  primaryColor = "#7C3AED",
  secondaryColor = "#06B6D4",
  jerseyNumber,
  photoUrl,
  size = "md",
  showNum = true,
  className = "",
}: PlayerAvatarProps) {
  const s = SIZES[size];
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`;
  const fg = readable(secondaryColor);

  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      <div
        className={`rounded-full overflow-hidden flex items-center justify-center font-display font-bold tracking-tight ${s.box} ${s.text}`}
        style={
          photoUrl
            ? { background: "#1A1A1F" }
            : {
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                color: fg,
              }
        }
      >
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={`${firstName} ${lastName}`}
            width={s.px}
            height={s.px}
            className="w-full h-full object-cover object-top"
            unoptimized={false}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {showNum && jerseyNumber && (
        <div
          className={`absolute rounded-full flex items-center justify-center font-display font-semibold ring-2 ring-[#0A0A0B] bg-[#1A1A1F] text-white ${s.num}`}
        >
          {jerseyNumber}
        </div>
      )}
    </div>
  );
}
