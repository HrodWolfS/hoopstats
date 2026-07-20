import { type Metadata } from "next";

export const revalidate = false;

export const metadata: Metadata = {
  title: "Politique de confidentialité | hoopstats",
  alternates: { canonical: "/fr/politique-confidentialite" },
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
          hoopstats mesure uniquement des actions produit agrégées par jour :
          recherches avec ou sans résultat, utilisation des filtres,
          comparaisons et partages. Aucun terme recherché, identifiant
          utilisateur, cookie, adresse IP ou empreinte du navigateur
          n&apos;est enregistré dans la base analytics.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-white font-semibold">Hébergement des données</h2>
        <p className="text-white/70 text-sm leading-relaxed">
          Les compteurs agrégés sont hébergés dans la même base de données que
          les statistiques du site. Les pages sont servies via Vercel.
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
        <p className="text-white/40 text-xs">Dernière mise à jour : juillet 2026</p>
      </section>
    </div>
  );
}
