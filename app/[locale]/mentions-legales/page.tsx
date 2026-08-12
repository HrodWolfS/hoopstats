import { type Metadata } from "next";

export const revalidate = false;

export const metadata: Metadata = {
  title: "Mentions légales | hoopstats",
};

export default function MentionsLegalesPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 py-10">
      <h1 className="text-3xl font-semibold text-white">Mentions légales</h1>

      <section className="space-y-2">
        <h2 className="text-white font-semibold">Éditeur du site</h2>
        <p className="text-white/70 text-sm leading-relaxed">
          Rodolphe Stempfel, développeur indépendant
          <br />
          Hem (59), France
          <br />
          Contact :{" "}
          <a
            href="mailto:stempfel.rodolphe@gmail.com"
            className="underline hover:text-white transition-colors"
          >
            stempfel.rodolphe@gmail.com
          </a>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-white font-semibold">Hébergement</h2>
        <p className="text-white/70 text-sm leading-relaxed">
          Vercel Inc.
          <br />
          340 Pine Street Suite 603
          <br />
          San Francisco, CA 94104 — États-Unis
          <br />
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white transition-colors"
          >
            vercel.com
          </a>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-white font-semibold">
          Droits et propriété intellectuelle
        </h2>
        <p className="text-white/70 text-sm leading-relaxed">
          Les logos et marques NBA ainsi que ceux des équipes appartiennent à
          leurs propriétaires respectifs (NBA Properties, Inc. et franchises
          affiliées). Leur utilisation sur ce site est strictement informative
          et non commerciale.
        </p>
        <p className="text-white/70 text-sm leading-relaxed">
          La majorité des photos de joueurs proviennent de Wikimedia Commons
          sous licences libres (Creative Commons CC-BY-SA ou domaine public) ;
          leur auteur est cité sur la page du joueur. Une minorité de photos,
          ainsi que les logos d&apos;équipes, sont affichées depuis le CDN de la
          NBA et restent la propriété de leurs détenteurs.
        </p>
        <p className="text-white/70 text-sm leading-relaxed">
          Les biographies sont adaptées de Wikipédia, sous licence CC BY-SA. Le
          lien vers l&apos;article d&apos;origine figure sous chaque biographie.
        </p>
        <p className="text-white/70 text-sm leading-relaxed">
          Les statistiques présentées proviennent de sources publiques et sont
          fournies à titre informatif.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-white font-semibold">Contact</h2>
        <p className="text-white/70 text-sm leading-relaxed">
          Pour toute question relative au site :{" "}
          <a
            href="mailto:stempfel.rodolphe@gmail.com"
            className="underline hover:text-white transition-colors"
          >
            stempfel.rodolphe@gmail.com
          </a>
        </p>
      </section>
    </div>
  );
}
