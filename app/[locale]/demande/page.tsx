import { type Metadata } from "next";
import Link from "next/link";
import { StatRequestForm } from "@/components/stat-request-form";
import { sanitizeRequestPage } from "@/lib/stat-requests";

export const metadata: Metadata = {
  title: "Quelle statistique cherchez-vous ? | hoopstats",
  description:
    "Dites-nous quelle statistique NBA vous ne trouvez pas sur hoopstats. Ni nom ni e-mail demandés.",
  alternates: { canonical: "/fr/demande" },
};

export default async function DemandePage({
  searchParams,
}: {
  searchParams: Promise<{ depuis?: string | string[] }>;
}) {
  const { depuis } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-4 md:py-8">
      <header className="space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orange-400/70">Vos besoins</p>
        <h1 className="font-display text-3xl font-semibold text-white md:text-4xl">
          Quelle statistique cherchez-vous ?
        </h1>
        <p className="text-sm leading-relaxed text-white/50">
          Une stat introuvable ici ou ailleurs en français ? Choisissez une catégorie et
          précisez si vous voulez. Les demandes les plus fréquentes décident des prochaines pages.
        </p>
      </header>

      <StatRequestForm origin={sanitizeRequestPage(Array.isArray(depuis) ? depuis[0] : depuis)} />

      <p className="text-xs leading-relaxed text-white/30">
        Ni nom ni e-mail : seuls la catégorie, votre texte, la page d’où vous venez et la date sont
        enregistrés, puis effacés après 12 mois.{" "}
        <Link href="/fr/politique-confidentialite" className="underline hover:text-white/60">
          Politique de confidentialité
        </Link>
      </p>
    </div>
  );
}
