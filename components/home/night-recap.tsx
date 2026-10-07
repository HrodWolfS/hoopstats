import Link from "next/link";
import Image from "next/image";
import { stat, record } from "@/lib/format";
import { previousSeason } from "@/lib/nba";
import { GAME_PHASE_LABELS, type GamePhase } from "@/lib/season-phase";
import { nightLabel, statLine, BIG_GAME_HORIZON_DAYS, RECENT_GAMES, SEASON_PROGRESSION_MIN_GAMES } from "@/lib/stats/night";
import type { NightData, NightGame, NightPerformance, NightTeam } from "@/lib/stats/night-data";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { TeamMono } from "@/components/ui/team-mono";

const PARIS = "Europe/Paris";

function parisDateTime(date: Date): string {
  const day = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: PARIS });
  const time = date.toLocaleTimeString("fr-FR", { hour: "numeric", minute: "2-digit", timeZone: PARIS }).replace(":", " h ");
  return `${day} à ${time}`;
}

function phaseSummary(phases: GamePhase[]): string {
  return phases.map((phase) => GAME_PHASE_LABELS[phase] ?? phase).join(" · ");
}

function signed(value: number): string {
  return `${value > 0 ? "+" : ""}${stat(value)}`;
}

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orange-400/70">{children}</p>;
}

function Why({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 border-t border-white/[0.05] pt-3 text-[11px] leading-relaxed text-white/35">
      <span className="font-semibold text-white/50">Pourquoi : </span>
      {children}
    </p>
  );
}

function SectionTitle({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      {aside}
    </div>
  );
}

const asideLink =
  "shrink-0 font-mono text-[11px] uppercase tracking-widest text-white/40 transition hover:text-orange-300";

function ResultCard({ game, locale }: { game: NightGame; locale: string }) {
  const homeWon = (game.homeScore ?? 0) > (game.awayScore ?? 0);
  const logo = (team: NightTeam) =>
    team.logoUrl && <Image src={team.logoUrl} alt="" width={24} height={24} className="shrink-0 object-contain" unoptimized />;
  const abbr = (team: NightTeam, won: boolean) => (
    <span className={`truncate font-mono text-xs ${won ? "text-white" : "text-white/45"}`}>{team.abbr}</span>
  );
  const score = (value: number | null, won: boolean) => (
    <span className={`font-mono text-sm font-semibold tabular-nums ${won ? "text-white" : "text-white/40"}`}>{value ?? "–"}</span>
  );
  return (
    <Link
      href={`/${locale}/matchs/${game.id}`}
      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#111114] px-3 py-3 transition hover:border-white/[0.12]"
      aria-label={`${game.awayTeam.city} ${game.awayScore ?? ""}, ${game.homeTeam.city} ${game.homeScore ?? ""} : box score`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {logo(game.awayTeam)}
        {abbr(game.awayTeam, !homeWon)}
        <span className="ml-auto">{score(game.awayScore, !homeWon)}</span>
      </div>
      <span className="text-white/15">–</span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <span className="mr-auto">{score(game.homeScore, homeWon)}</span>
        {abbr(game.homeTeam, homeWon)}
        {logo(game.homeTeam)}
      </div>
    </Link>
  );
}

function PerformanceCard({
  performance,
  rank,
  colors,
  locale,
}: {
  performance: NightPerformance;
  rank: number;
  colors: Map<string, NightTeam>;
  locale: string;
}) {
  const team = colors.get(performance.teamAbbr);
  const [firstName, ...rest] = performance.player
    ? [performance.player.firstName, performance.player.lastName]
    : performance.playerName.split(" ");
  const lastName = rest.join(" ");
  return (
    <article className="flex flex-col rounded-2xl border border-white/[0.06] bg-[#111114] p-4">
      <div className="flex items-center gap-3">
        <PlayerAvatar
          firstName={firstName}
          lastName={lastName}
          primaryColor={team?.primaryColor}
          secondaryColor={team?.secondaryColor}
          photoUrl={performance.player?.photoUrl}
          size="sm"
          showNum={false}
        />
        <div className="min-w-0 flex-1">
          {performance.player ? (
            <Link
              href={`/${locale}/joueurs/${performance.player.slug}`}
              className="block truncate text-sm font-semibold hover:text-orange-300"
            >
              {firstName} {lastName}
            </Link>
          ) : (
            <span className="block truncate text-sm font-semibold">{performance.playerName}</span>
          )}
          <span className="text-[11px] text-white/35">
            {performance.teamAbbr} contre {performance.opponentAbbr}
          </span>
        </div>
        <span className="font-mono text-xs text-orange-300/80">n° {rank}</span>
      </div>
      <p className="mt-3 font-display text-xl font-semibold tabular-nums">{statLine(performance)}</p>
      <Why>
        Game Score de {stat(performance.gameScore)}, {rank === 1 ? "le meilleur" : `le ${rank}e`} de la nuit.{" "}
        <Link href={`/${locale}/matchs/${performance.gameId}`} className="text-white/55 underline decoration-white/15 underline-offset-2 hover:text-white">
          Box score
        </Link>
      </Why>
    </article>
  );
}

export function FrenchRow({ performance, locale }: { performance: NightPerformance; locale: string }) {
  const name = performance.player
    ? `${performance.player.firstName} ${performance.player.lastName}`
    : performance.playerName;
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        {performance.player ? (
          <Link href={`/${locale}/joueurs/${performance.player.slug}`} className="block truncate text-sm font-medium hover:text-orange-300">
            {name}
          </Link>
        ) : (
          <span className="block truncate text-sm font-medium">{name}</span>
        )}
        <span className="text-[11px] text-white/35">
          {performance.teamAbbr} contre {performance.opponentAbbr} · {performance.minutes?.split(":")[0] ?? "0"} min
        </span>
      </div>
      <Link
        href={`/${locale}/matchs/${performance.gameId}`}
        className="shrink-0 text-right font-mono text-xs tabular-nums text-white/70 hover:text-orange-300"
      >
        {statLine(performance)}
      </Link>
    </li>
  );
}

function InsightCard({ kicker, children }: { kicker: string; children: React.ReactNode }) {
  return (
    <article className="flex flex-col rounded-2xl border border-white/[0.06] bg-[#111114] p-4">
      <Kicker>{kicker}</Kicker>
      <div className="mt-2 flex flex-1 flex-col">{children}</div>
    </article>
  );
}

function ProgressionCard({ data, locale }: { data: NonNullable<NightData["progression"]>; locale: string }) {
  const { player } = data;
  return (
    <InsightCard kicker="Plus forte progression">
      <Link href={`/${locale}/joueurs/${player.slug}`} className="font-display text-lg font-semibold hover:text-orange-300">
        {player.firstName} {player.lastName}
      </Link>
      <p className="mt-1 text-sm text-white/60">
        <span className="font-mono font-semibold text-emerald-400">{signed(data.delta)} pts</span>{" "}
        {data.mode === "recent"
          ? `: ${stat(data.after)} sur ses ${RECENT_GAMES} derniers matchs, contre ${stat(data.before)} en moyenne sur la saison.`
          : `par match : ${stat(data.before)} → ${stat(data.after)} entre ${previousSeason(data.season)} et ${data.season}.`}
      </p>
      <Why>
        {data.mode === "recent"
          ? `plus forte hausse de points entre ses ${RECENT_GAMES} derniers matchs et sa moyenne de saison régulière ${data.season}.`
          : `plus forte hausse de points par match d'une saison à l'autre, parmi les joueurs à ${SEASON_PROGRESSION_MIN_GAMES} matchs ou plus sur chacune. La saison ${data.season} est la dernière terminée.`}
      </Why>
    </InsightCard>
  );
}

function StreakCard({ data, locale }: { data: NonNullable<NightData["streak"]>; locale: string }) {
  const { team } = data;
  const what = data.kind === "W" ? "victoires" : "défaites";
  return (
    <InsightCard kicker={data.mode === "active" ? "Série en cours" : `Plus longue série ${data.season}`}>
      <Link href={`/${locale}/equipes/${team.slug}?saison=${data.season}`} className="flex items-center gap-3 hover:text-orange-300">
        <TeamMono abbr={team.abbr} primaryColor={team.primaryColor} secondaryColor={team.secondaryColor} logoUrl={team.logoUrl} size="xs" />
        <span className="font-display text-lg font-semibold">
          {team.city} {team.name}
        </span>
      </Link>
      <p className="mt-1 text-sm text-white/60">
        <span className={`font-mono font-semibold ${data.kind === "W" ? "text-emerald-400" : "text-red-400"}`}>
          {data.length} {what}
        </span>{" "}
        de suite{data.mode === "season" ? " en saison régulière" : ""}
        {data.tied > 0 ? `, à égalité avec ${data.tied} autre${data.tied > 1 ? "s" : ""} équipe${data.tied > 1 ? "s" : ""}` : ""}.
      </p>
      <Why>
        {data.mode === "active"
          ? "la plus longue série en cours en saison régulière."
          : `hors saison, pas de série en cours : la plus longue série de victoires de la dernière saison régulière, ${data.season}.`}
      </Why>
    </InsightCard>
  );
}

function BigGameCard({ data, locale }: { data: NonNullable<NightData["bigGame"]>; locale: string }) {
  if (data.kind === "opener") {
    return (
      <InsightCard kicker="Prochain rendez-vous">
        <p className="font-display text-lg font-semibold">Reprise de la saison {data.season}</p>
        <p className="mt-1 text-sm text-white/60">Premiers matchs {parisDateTime(data.date).replace(/ à .*/, "")}.</p>
        <Why>aucun match programmé dans les {BIG_GAME_HORIZON_DAYS} prochains jours.</Why>
      </InsightCard>
    );
  }
  const recordOf = (value: { wins: number; losses: number } | null) => (value ? record(value.wins, value.losses) : "sans bilan");
  return (
    <InsightCard kicker={data.phase === "preseason" ? "Affiche à venir · présaison" : "Affiche à venir"}>
      <Link href={`/${locale}/matchs/${data.id}`} className="font-display text-lg font-semibold hover:text-orange-300">
        {data.awayTeam.abbr} – {data.homeTeam.abbr}
      </Link>
      <p className="mt-1 text-sm text-white/60">
        {data.awayTeam.city} {data.awayTeam.name} chez {data.homeTeam.city} {data.homeTeam.name},{" "}
        {parisDateTime(data.gameDate)}.
      </p>
      <Why>
        meilleur bilan cumulé en {data.recordSeason} ({data.awayTeam.abbr} {recordOf(data.awayRecord)},{" "}
        {data.homeTeam.abbr} {recordOf(data.homeRecord)}) parmi les {data.candidates} matchs des {BIG_GAME_HORIZON_DAYS} prochains jours.
      </Why>
    </InsightCard>
  );
}

export function NightRecap({ data, locale }: { data: NightData; locale: string }) {
  const teams = new Map(data.games.flatMap((game) => [[game.homeTeam.abbr, game.homeTeam], [game.awayTeam.abbr, game.awayTeam]] as const));
  const gamesLabel = `${data.games.length} match${data.games.length > 1 ? "s" : ""}`;
  return (
    <section aria-labelledby="nuit-titre" className="space-y-7">
      <header>
        <Kicker>
          {nightLabel(data.key)} · {phaseSummary(data.phases)} · {gamesLabel}
        </Kicker>
        <h1 id="nuit-titre" className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-5xl">
          La nuit NBA en chiffres
        </h1>
        {data.age > 1 && (
          <p className="mt-2 text-sm text-white/45">
            Pas de match depuis {data.age - 1} jour{data.age > 2 ? "s" : ""} : voici les derniers résultats.
          </p>
        )}
        <p className="mt-2 text-xs text-white/35">
          {data.updatedAt ? `Données mises à jour ${parisDateTime(data.updatedAt)} (heure de Paris). ` : ""}
          <Link href={`/${locale}/sources#accueil`} className="underline decoration-white/15 underline-offset-2 hover:text-white">
            Règles de sélection
          </Link>
        </p>
      </header>

      <div>
        <SectionTitle title="Résultats" aside={<Link href={`/${locale}/matchs`} className={asideLink}>Tous →</Link>} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {data.games.map((game) => (
            <ResultCard key={game.id} game={game} locale={locale} />
          ))}
        </div>
      </div>

      {data.performances.length > 0 && (
        <div>
          <SectionTitle title="Performances de la nuit" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {data.performances.map((performance, index) => (
              <PerformanceCard
                key={`${performance.gameId}-${performance.playerName}`}
                performance={performance}
                rank={index + 1}
                colors={teams}
                locale={locale}
              />
            ))}
          </div>
        </div>
      )}

      {data.hasBoxScores && (
        <div>
          <SectionTitle
            title="Les Français"
            aside={
              <Link href={`/${locale}/francais`} className={asideLink}>
                Français en NBA →
              </Link>
            }
          />
          <div className="rounded-2xl border border-white/[0.06] bg-[#111114]">
            {data.french.length > 0 ? (
              <ul className="divide-y divide-white/[0.04]">
                {data.french.map((performance) => (
                  <FrenchRow key={`${performance.gameId}-${performance.playerName}`} performance={performance} locale={locale} />
                ))}
              </ul>
            ) : (
              <p className="px-4 py-4 text-sm text-white/40">Aucun joueur français n&apos;est entré en jeu cette nuit.</p>
            )}
          </div>
        </div>
      )}

      {(data.progression || data.streak || data.bigGame) && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {data.progression && <ProgressionCard data={data.progression} locale={locale} />}
          {data.streak && <StreakCard data={data.streak} locale={locale} />}
          {data.bigGame && <BigGameCard data={data.bigGame} locale={locale} />}
        </div>
      )}
    </section>
  );
}
