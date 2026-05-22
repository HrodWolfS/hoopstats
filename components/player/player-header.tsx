import { PlayerAvatar } from "@/components/ui/player-avatar";
import { KPI } from "@/components/ui/kpi";
import { stat, pct } from "@/lib/format";

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
  // Stats saison courante
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
  ppg,
  rpg,
  apg,
  tsPct,
}: PlayerHeaderData) {
  return (
    <section className="grid grid-cols-12 gap-8 items-start">
      {/* Avatar */}
      <div className="col-span-12 md:col-span-3 flex justify-center md:justify-start">
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
      <div className="col-span-12 md:col-span-9 space-y-5">
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

        {summaryFr && (
          <p className="text-sm text-white/50 leading-relaxed max-w-2xl">
            {summaryFr}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPI
            label="Points"
            value={stat(ppg)}
            unit="par match"
            accent={primaryColor}
          />
          <KPI
            label="Rebonds"
            value={stat(rpg)}
            unit="par match"
            accent={secondaryColor}
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
    </section>
  );
}
