import Link from "next/link";
import { stat } from "@/lib/format";

export type PlayerGameLog = {
  id: string;
  date: string;
  opponent: string;
  opponentSlug: string;
  home: boolean;
  won: boolean;
  minutes: string | null;
  pts: number | null;
  reb: number | null;
  ast: number | null;
  plusMinus: number | null;
};

function average(rows: PlayerGameLog[], key: "pts" | "reb" | "ast") {
  const values = rows.map((row) => row[key]).filter((value): value is number => value != null);
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function GameLogView({ logs, locale }: { logs: PlayerGameLog[]; locale: string }) {
  const splits = [
    { label: "Domicile", rows: logs.filter((row) => row.home) },
    { label: "Extérieur", rows: logs.filter((row) => !row.home) },
    { label: "Victoires", rows: logs.filter((row) => row.won) },
    { label: "Défaites", rows: logs.filter((row) => !row.won) },
  ];
  const opponentSplits = Array.from(new Set(logs.map((row) => row.opponent)))
    .map((opponent) => ({
      opponent,
      slug: logs.find((row) => row.opponent === opponent)!.opponentSlug,
      rows: logs.filter((row) => row.opponent === opponent),
    }))
    .sort((left, right) => right.rows.length - left.rows.length || left.opponent.localeCompare(right.opponent));

  if (logs.length === 0) {
    return <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] py-12 text-center text-sm text-white/30">Aucun game log relié pour cette saison.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {splits.map((split) => (
          <div key={split.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[9px] font-mono uppercase tracking-wider text-white/25">{split.label} · {split.rows.length} MJ</div>
            <div className="mt-2 flex gap-4 font-mono tabular-nums">
              <SplitValue label="PTS" value={average(split.rows, "pts")} />
              <SplitValue label="REB" value={average(split.rows, "reb")} />
              <SplitValue label="PAS" value={average(split.rows, "ast")} />
            </div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-white/30">
            <tr><th className="px-4 py-3 text-left">Date</th><th className="px-3 py-3 text-left">Adversaire</th><th className="px-3 py-3 text-center">Rés.</th><th className="px-3 py-3 text-right">MIN</th><th className="px-3 py-3 text-right">PTS</th><th className="px-3 py-3 text-right">REB</th><th className="px-3 py-3 text-right">PAS</th><th className="px-4 py-3 text-right">+/-</th></tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {logs.slice(0, 25).map((log) => (
              <tr key={log.id} className="border-b border-white/[0.04]">
                <td className="px-4 py-3 text-white/35"><Link href={`/${locale}/matchs/${log.id}`} className="hover:text-orange-300">{log.date}</Link></td>
                <td className="px-3 py-3"><Link href={`/${locale}/equipes/${log.opponentSlug}`} className="text-white/65 hover:text-orange-300">{log.home ? "vs" : "@"} {log.opponent}</Link></td>
                <td className={`px-3 py-3 text-center ${log.won ? "text-emerald-400" : "text-rose-400"}`}>{log.won ? "V" : "D"}</td>
                <td className="px-3 py-3 text-right text-white/40">{log.minutes ?? "—"}</td>
                <td className="px-3 py-3 text-right text-white">{log.pts ?? "—"}</td>
                <td className="px-3 py-3 text-right text-white/60">{log.reb ?? "—"}</td>
                <td className="px-3 py-3 text-right text-white/60">{log.ast ?? "—"}</td>
                <td className="px-4 py-3 text-right text-white/35">{log.plusMinus != null && log.plusMinus > 0 ? "+" : ""}{log.plusMinus ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h3 className="mb-4 text-[10px] font-mono uppercase tracking-[0.16em] text-white/30">Splits par adversaire</h3>
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {opponentSplits.map((split) => (
            <Link key={split.opponent} href={`/${locale}/equipes/${split.slug}`} className="flex items-center justify-between border-b border-white/[0.04] pb-2 text-xs hover:text-orange-300">
              <span className="text-white/55">{split.opponent} <span className="text-white/20">· {split.rows.length} MJ</span></span>
              <span className="font-mono tabular-nums text-white/40">{stat(average(split.rows, "pts"))} PTS</span>
            </Link>
          ))}
        </div>
      </div>
      <p className="text-[10px] font-mono text-white/20">25 derniers matchs affichés · splits calculés sur {logs.length} matchs reliés</p>
    </div>
  );
}

function SplitValue({ label, value }: { label: string; value: number | null }) {
  return <div><div className="text-[8px] text-white/20">{label}</div><div className="text-white/70">{stat(value)}</div></div>;
}
