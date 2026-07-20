import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuide, GUIDES } from "@/lib/guides";

export function generateStaticParams() { return GUIDES.map((guide) => ({ slug: guide.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return { title: `${guide.title} | hoopstats`, description: guide.description, alternates: { canonical: `/${locale}/guides/${slug}` } };
}

export default async function GuidePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: guide.title, description: guide.description, inLanguage: "fr" };
  return <article className="mx-auto max-w-3xl space-y-8"><nav className="text-xs text-white/30"><Link href={`/${locale}/guides`} className="hover:text-white">Guides</Link><span className="mx-2">/</span>{guide.title}</nav><header><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orange-400/70">Guide hoopstats</p><h1 className="mt-3 font-display text-4xl font-semibold leading-tight">{guide.title}</h1><p className="mt-4 text-lg leading-relaxed text-white/45">{guide.description}</p></header>{guide.sections.map((section, index) => <section key={section.title} className="rounded-2xl border border-white/[0.06] bg-[#111114] p-6"><div className="font-mono text-[10px] text-orange-300">0{index + 1}</div><h2 className="mt-2 font-display text-2xl font-semibold">{section.title}</h2><p className="mt-3 leading-7 text-white/60">{section.text}</p></section>)}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} /></article>;
}
