"use client";

import { useState } from "react";
import Link from "next/link";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { stat } from "@/lib/format";

type RosterCardProps = {
  firstName: string;
  lastName: string;
  position: string | null;
  jerseyNumber?: string | null;
  primaryColor: string;
  secondaryColor: string;
  photoUrl?: string | null;
  pts: number;
  reb: number;
  ast: number;
  slug: string;
  locale: string;
};

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/[0.03] py-1.5">
      <div className="font-display font-semibold text-base tabular-nums">
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-wider text-white/40">
        {label}
      </div>
    </div>
  );
}

export function RosterCard({
  firstName,
  lastName,
  position,
  jerseyNumber,
  primaryColor,
  secondaryColor,
  photoUrl,
  pts,
  reb,
  ast,
  slug,
  locale,
}: RosterCardProps) {
  const [hover, setHover] = useState(false);

  return (
    <Link
      href={`/${locale}/joueurs/${slug}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group relative rounded-2xl border border-white/[0.06] bg-[#111114] p-4 transition hover:border-white/[0.15] overflow-hidden block"
      style={{ boxShadow: hover ? `0 0 0 1px ${primaryColor}40` : "none" }}
    >
      <div className="flex items-start gap-4">
        <PlayerAvatar
          firstName={firstName}
          lastName={lastName}
          photoUrl={photoUrl}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          jerseyNumber={jerseyNumber}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-white/40 flex items-center gap-2 whitespace-nowrap">
            <span>{position ?? "—"}</span>
          </div>
          <div className="mt-1 font-display font-semibold text-lg leading-tight tracking-tight truncate">
            {firstName} {lastName}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <StatBox label="PPM" value={stat(pts)} />
            <StatBox label="RPM" value={stat(reb)} />
            <StatBox label="PDM" value={stat(ast)} />
          </div>
        </div>
      </div>
      {jerseyNumber && (
        <div
          className={`absolute right-3 top-3 text-[10px] font-mono text-white/30 transition ${hover ? "opacity-0" : "opacity-100"}`}
        >
          #{jerseyNumber}
        </div>
      )}
    </Link>
  );
}
