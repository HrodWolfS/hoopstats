import { PlayerAvatar } from "@/components/ui/player-avatar";
import { KPI } from "@/components/ui/kpi";
import { stat, pct } from "@/lib/format";
import { accentOnDark } from "@/lib/color";

export type PlayerHeaderData = {
  firstName: string;
  lastName: string;
  position: string | null;
  country: string | null;
  teamCity: string | null;
  teamName: string | null;
  teamAbbr: string | null;
  primaryColor: string;
  secondaryColor: string;
  photoUrl?: string | null;
  summaryFr?: string | null;
  /** Source de la biographie : Wikipédia impose d'attribuer le texte réutilisé. */
  wikipediaUrlFr?: string | null;
  /** Auteur et licence de la photo, exigés par les licences Creative Commons. */
  photoAttribution?: string | null;
  /** Saison demandée (sélecteur ou saison en cours). */
  season: string;
  /**
   * Saison d'où viennent les cartes. Elle diffère de `season` quand le
   * joueur n'y a pas joué : les cartes montrent alors sa dernière saison,
   * ce que la légende doit dire.
   */
  statsSeason: string | null;
  ppg: number | null;
  rpg: number | null;
  apg: number | null;
  tsPct: number | null;
};

export function PlayerHeader({
  firstName,
  lastName,
  position,
  country,
  teamCity,
  teamName,
  teamAbbr,
  primaryColor,
  secondaryColor,
  photoUrl,
  summaryFr,
  wikipediaUrlFr,
  photoAttribution,
  season,
  statsSeason,
  ppg,
  rpg,
  apg,
  tsPct,
}: PlayerHeaderData) {
  return (
    <section className="grid grid-cols-12 gap-8 items-start">
      {/* Avatar */}
      {/* Côte à côte dès lg seulement : entre 768 et 1024 px, la photo de
          224 px débordait sur le nom. */}
      <div className="col-span-12 lg:col-span-3 flex justify-center lg:justify-start">
        <PlayerAvatar
          firstName={firstName}
          lastName={lastName}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          photoUrl={photoUrl}
          size="hero"
          showNum={false}
        />
      </div>

      {/* Infos */}
      <div className="col-span-12 lg:col-span-9 flex flex-col gap-5">
        <div>
          <div className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium mb-3">
            {position ?? "—"}
            {country ? ` · ${country}` : ""}
            {teamAbbr ? ` · ${teamAbbr}` : ""}
          </div>
          <h1 className="font-display font-semibold text-5xl md:text-6xl tracking-[-0.04em] leading-[0.95]">
            {firstName}
            <br />
            <span className="text-white/40">{lastName}</span>
          </h1>
          {teamCity && teamName && (
            <p className="text-sm text-white/40 mt-3">
              {teamCity} {teamName}
            </p>
          )}
        </div>

        {/* Sur mobile et tablette, les chiffres passent avant la biographie. */}
        {summaryFr && (
          <div className="max-w-2xl space-y-1.5 order-3 lg:order-none">
            <p className="text-sm leading-relaxed text-white/50">{summaryFr}</p>
            {/* CC BY-SA impose de créditer la source du texte réutilisé. */}
            <p className="text-[11px] text-white/25">
              Biographie adaptée de{" "}
              {wikipediaUrlFr ? (
                <a
                  href={wikipediaUrlFr}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-white/20 underline-offset-2 hover:text-white/50"
                >
                  Wikipédia
                </a>
              ) : (
                "Wikipédia"
              )}{" "}
              · CC BY-SA
            </p>
          </div>
        )}
        {photoAttribution && (
          <p className="text-[11px] text-white/25 order-4 lg:order-none">
            Photo : {photoAttribution}
          </p>
        )}

        <div className="flex flex-col gap-2 order-2 lg:order-none">
          {statsSeason && (
            <p className="text-[11px] uppercase tracking-[0.12em] text-white/40 font-medium">
              Moyennes {statsSeason}
              {statsSeason !== season && (
                <span className="normal-case tracking-normal text-white/30">
                  {" "}
                  · aucun match en {season}
                </span>
              )}
            </p>
          )}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <KPI
              label="Points"
              value={stat(ppg)}
              unit="par match"
              accent={accentOnDark(primaryColor)}
            />
            <KPI
              label="Rebonds"
              value={stat(rpg)}
              unit="par match"
              accent={accentOnDark(secondaryColor)}
            />
            <KPI
              label="Passes"
              value={stat(apg)}
              unit="par match"
              accent="#7C3AED"
            />
            <KPI
              label="True Shooting"
              value={tsPct != null ? pct(tsPct) : "—"}
              unit="%"
              accent="#10B981"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
