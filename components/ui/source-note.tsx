import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  DATA_KIND_LABEL,
  DATA_ORIGINS,
  latestUpdate,
  type DataKind,
  type DataOriginKey,
} from "@/lib/data-sources";

const KIND_STYLE: Record<DataKind, string> = {
  official: "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300",
  imported: "border-sky-500/25 bg-sky-500/[0.08] text-sky-300",
  computed: "border-amber-500/25 bg-amber-500/[0.08] text-amber-300",
};

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

type SourceNoteProps = {
  origins: readonly DataOriginKey[];
  locale: string;
};

/**
 * Bloc « Source et mise à jour » : d'où viennent les chiffres de la page,
 * leur nature (officielle, importée, calculée) et la date du dernier import
 * réussi de chacun.
 */
export async function SourceNote({ origins, locale }: SourceNoteProps) {
  const unique = [...new Set(origins)];
  const logSources = [...new Set(unique.flatMap((key) => DATA_ORIGINS[key].logSources))];
  const grouped = await prisma.syncLog.groupBy({
    by: ["source"],
    where: { source: { in: logSources }, status: { in: ["success", "partial"] } },
    _max: { completedAt: true },
  });
  const logs = grouped.flatMap((log) =>
    log._max.completedAt ? [{ source: log.source, completedAt: log._max.completedAt }] : [],
  );

  return (
    <aside
      aria-label="Source et mise à jour"
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[11px] leading-relaxed text-white/40"
    >
      <p className="mb-2 font-mono uppercase tracking-wider text-white/25">
        Source et mise à jour
      </p>
      <ul className="space-y-1.5">
        {unique.map((key) => {
          const origin = DATA_ORIGINS[key];
          const updated = latestUpdate(origin, logs);
          return (
            <li key={key} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span
                className={`rounded border px-1.5 py-px text-[10px] font-medium ${KIND_STYLE[origin.kind]}`}
              >
                {DATA_KIND_LABEL[origin.kind]}
              </span>
              <span className="text-white/55">{origin.label}</span>
              <span>
                {updated ? (
                  <>
                    · mis à jour le{" "}
                    <time dateTime={updated.toISOString()}>{DATE_FORMAT.format(updated)}</time>
                  </>
                ) : (
                  "· date de mise à jour inconnue"
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <Link
        href={`/${locale}/sources`}
        className="mt-2 inline-block text-white/50 underline underline-offset-2 transition hover:text-white/80"
      >
        Méthode et limites →
      </Link>
    </aside>
  );
}
