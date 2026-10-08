"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { sendAnalyticsEvent } from "@/components/analytics/analytics-event";
import { seasonChangeDimension } from "@/lib/page-tracking";

type SeasonSelectProps = {
  slot: "j1" | "j2";
  /** Saisons jouées, la plus récente en tête. */
  seasons: string[];
  value: string;
  /** Saison de l'autre côté et saisons jouées par l'autre joueur. */
  otherValue: string | null;
  otherSeasons: string[];
  samePlayer: boolean;
  label: string;
};

/**
 * Saison d'un côté de la comparaison, gardée dans l'URL (`s1`, `s2`). Les
 * deux saisons y sont toujours écrites : le lien partagé restitue exactement
 * la comparaison, et changer un côté ne déplace jamais l'autre.
 */
export function SeasonSelect({
  slot,
  seasons,
  value,
  otherValue,
  otherSeasons,
  samePlayer,
  label,
}: SeasonSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const own = slot === "j1" ? "s1" : "s2";
  const other = slot === "j1" ? "s2" : "s1";

  function select(season: string) {
    const dimension = season === value ? null : seasonChangeDimension("comparer", season);
    if (dimension) sendAnalyticsEvent("season_change", dimension);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("saison");
    params.set(own, season);
    if (otherValue) params.set(other, otherValue);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  // Saisons sans l'autre joueur regroupées à part : un suffixe dans le
  // libellé déborderait du sélecteur fermé.
  const shared = samePlayer ? seasons : seasons.filter((season) => otherSeasons.includes(season));
  const alone = samePlayer ? [] : seasons.filter((season) => !otherSeasons.includes(season));
  const groups =
    alone.length === 0
      ? [{ title: null, items: shared }]
      : [
          { title: "Saisons en commun", items: shared },
          { title: "Sans l'autre joueur", items: alone },
        ].filter((group) => group.items.length > 0);
  const option = (season: string) => (
    <option key={season} value={season} className="bg-[#16161A]">
      {season}
    </option>
  );

  return (
    <label className="relative block w-full">
      <span className="sr-only">{label}</span>
      {/* Flèche dessinée à part : celle du navigateur mange la saison à 320 px. */}
      <select
        value={value}
        onChange={(e) => select(e.target.value)}
        className="w-full appearance-none rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-1.5 pr-4 font-mono text-[11px] text-white/80 focus:border-white/25 focus:outline-none sm:pl-2.5 sm:pr-6 sm:text-sm"
      >
        {groups.map(({ title, items }) =>
          title ? (
            <optgroup key={title} label={title} className="bg-[#16161A]">
              {items.map(option)}
            </optgroup>
          ) : (
            items.map(option)
          ),
        )}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-white/40 sm:right-2">
        ▾
      </span>
    </label>
  );
}
