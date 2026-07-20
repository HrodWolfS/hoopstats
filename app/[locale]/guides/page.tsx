import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/lib/guides";
import { PLAYER_METRICS } from "@/lib/stats/metrics";

export const metadata: Metadata = {
  title: "Guides des statistiques NBA en français | hoopstats",
  description: "Apprenez à lire, comparer et contextualiser les statistiques NBA avec des guides clairs en français.",
  alternates: { canonical: "/fr/guides" },
};

export default async function GuidesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <div className="space-y-9"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orange-400/70">Comprendre les chiffres</p><h1 className="mt-2 font-display text-4xl font-semibold">Guides statistiques NBA</h1><p className="mt-2 max-w-2xl text-sm text-white/40">Des méthodes concrètes pour interpréter les données sans oublier leur contexte.</p></div><div className="grid gap-4 md:grid-cols-3">{GUIDES.map((guide) => <Link key={guide.slug} href={`/${locale}/guides/${guide.slug}`} className="rounded-2xl border border-white/[0.06] bg-[#111114] p-5 hover:border-orange-500/20"><h2 className="font-display text-xl text-white/85">{guide.title}</h2><p className="mt-3 text-sm leading-relaxed text-white/40">{guide.description}</p><div className="mt-4 font-mono text-[10px] text-orange-300">Lire le guide →</div></Link>)}</div><section><h2 className="font-display text-2xl font-semibold">Glossaire avancé</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{PLAYER_METRICS.filter((metric) => metric.showInGlossary).map((metric) => <div key={metric.key} className="rounded-xl border border-white/[0.05] p-4"><div className="flex items-baseline justify-between"><h3 className="font-medium text-white/75">{metric.label}</h3><span className="font-mono text-xs text-orange-300">{metric.shortLabel}</span></div><p className="mt-2 text-xs leading-relaxed text-white/40">{metric.description}</p>{metric.formula && <p className="mt-2 font-mono text-[10px] text-white/25">{metric.formula}</p>}</div>)}</div></section></div>;
}
