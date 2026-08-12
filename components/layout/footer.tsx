import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] mt-auto py-6 px-8 lg:px-12">
      <div className="max-w-[1400px] mx-auto space-y-3 text-[11px] text-white/30 leading-relaxed">
        <p>
          Logos et marques NBA sont la propriété de leurs détenteurs respectifs.
          hoopstats les utilise dans un contexte éditorial et de référence.
        </p>
        <p>
          La plupart des photos proviennent de Wikimedia Commons sous licence
          Creative Commons, avec leur attribution sur la page du joueur. Les
          autres, comme les logos, sont servies par le CDN de la NBA.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
          <span>© {new Date().getFullYear()} hoopstats</span>
          <Link href="/fr/sources" className="hover:text-white/60 transition">
            Sources & Méthodologie
          </Link>
          <Link
            href="/fr/mentions-legales"
            className="hover:text-white/60 transition"
          >
            Mentions légales
          </Link>
          <Link
            href="/fr/politique-confidentialite"
            className="hover:text-white/60 transition"
          >
            Confidentialité
          </Link>
          <a
            href="mailto:contact@hoopstats.fr"
            className="hover:text-white/60 transition"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
