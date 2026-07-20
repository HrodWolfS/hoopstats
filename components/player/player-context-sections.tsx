import Link from "next/link";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import type { PlayerInsight } from "@/lib/stats/player-insights";

export type SimilarPlayerCard = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  teamAbbr: string;
  photoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  similarity: number;
};

export function PlayerInsights({ insights }: { insights: PlayerInsight[] }) {
  if (insights.length === 0) return null;
  return (
    <section className="space-y-3">
      <div><h2 className="font-display text-xl font-semibold">Ce que disent les chiffres</h2><p className="text-xs text-white/25">Constats déterministes à partir des percentiles affichés</p></div>
      <div className="grid gap-3 md:grid-cols-3">
        {insights.map((insight) => (
          <div key={insight.title} className="rounded-2xl border border-white/[0.06] bg-[#111114] p-5">
            <div className={`text-[10px] font-mono uppercase tracking-wider ${insight.tone === "strength" ? "text-emerald-400" : insight.tone === "watch" ? "text-amber-400" : "text-orange-300"}`}>{insight.title}</div>
            <p className="mt-3 text-sm leading-relaxed text-white/65">{insight.finding}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SimilarPlayers({ players, locale }: { players: SimilarPlayerCard[]; locale: string }) {
  if (players.length === 0) return null;
  return (
    <section className="space-y-3">
      <div><h2 className="font-display text-xl font-semibold">Profils similaires</h2><p className="text-xs text-white/25">Distance normalisée sur PTS, REB, PAS, INT, CTR et TS% · même groupe de poste</p></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {players.map((player) => (
          <Link key={player.id} href={`/${locale}/joueurs/${player.slug}`} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#111114] p-4 hover:border-orange-500/20">
            <PlayerAvatar firstName={player.firstName} lastName={player.lastName} photoUrl={player.photoUrl} primaryColor={player.primaryColor} secondaryColor={player.secondaryColor} size="sm" showNum={false} />
            <div className="min-w-0"><div className="truncate text-sm font-medium text-white/80">{player.firstName} {player.lastName}</div><div className="text-[10px] font-mono text-white/30">{player.teamAbbr} · {player.similarity}% proche</div></div>
          </Link>
        ))}
      </div>
    </section>
  );
}
