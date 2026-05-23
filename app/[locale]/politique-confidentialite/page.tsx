import { type Metadata } from "next";

export const revalidate = false;

export const metadata: Metadata = {
  title: "Politique de confidentialité | hoopstats",
};

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 py-10">
      <h1 className="text-3xl font-semibold text-white">
        Politique de confidentialité
      </h1>

      <section className="space-y-2">
        <h2 className="text-white font-semibold">Données collectées</h2>
        <p className="text-white/70 text-sm leading-relaxed">
          hoopstats ne collecte aucune donnée personnelle sans votre
          consentement explicite. Aucun formulaire d&apos;inscription ni compte
          utilisateur n&apos;est proposé sur ce site.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-white font-semibold">Cookies</h2>
        <p className="text-white/70 text-sm leading-relaxed">
          Aucun cookie de tracking ou publicitaire n&apos;est déposé par défaut.
          Le site peut utiliser des cookies techniques strictement nécessaires à
          son fonctionnement (session, préférences d&apos;affichage).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-white font-semibold">Mesure d&apos;audience</h2>
        <p className="text-white/70 text-sm leading-relaxed">
          Ce site utilise PostHog pour mesurer l&apos;audience de manière
          anonymisée. Les données de navigation (pages visitées, durée de
          session) sont collectées sans identifiant personnel. Si votre
          navigateur envoie un signal <abbr title="Do Not Track">DNT</abbr>, la
          collecte est automatiquement désactivée.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-white font-semibold">Hébergement des données</h2>
        <p className="text-white/70 text-sm leading-relaxed">
          Les données anonymisées de navigation sont hébergées par PostHog
          (infrastructure en Union européenne). Les pages du site sont servies
          via Vercel (CDN mondial).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-white font-semibold">Vos droits (RGPD)</h2>
        <p className="text-white/70 text-sm leading-relaxed">
          Conformément au Règlement Général sur la Protection des Données (RGPD)
          et à la loi Informatique et Libertés, vous disposez d&apos;un droit
          d&apos;accès, de rectification et d&apos;opposition concernant vos
          données. Pour exercer ces droits, contactez le responsable de
          traitement :
        </p>
        <p className="text-white/70 text-sm">
          <strong className="text-white/90">DPO / Contact :</strong>{" "}
          <a
            href="mailto:stempfel.rodolphe@gmail.com"
            className="underline hover:text-white transition-colors"
          >
            stempfel.rodolphe@gmail.com
          </a>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-white font-semibold">Mise à jour</h2>
        <p className="text-white/70 text-sm leading-relaxed">
          Cette politique peut être mise à jour à tout moment. La date de
          dernière modification sera indiquée en bas de page.
        </p>
        <p className="text-white/40 text-xs">Dernière mise à jour : mai 2025</p>
      </section>
    </div>
  );
}
