import { type Metadata } from "next";
import Link from "next/link";
import { MeasureToggle } from "@/components/analytics/measure-toggle";

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

      <section id="mesure" className="space-y-2 scroll-mt-20">
        <h2 className="text-white font-semibold">Mesure d&apos;audience</h2>
        <p className="text-white/70 text-sm leading-relaxed">
          hoopstats mesure uniquement des actions produit agrégées par jour :
          recherches avec ou sans résultat, utilisation des filtres,
          comparaisons, partages et exports. Aucun terme recherché, identifiant
          utilisateur, cookie, adresse IP ou empreinte du navigateur
          n&apos;est enregistré dans la base analytics.
        </p>
        <p className="text-white/70 text-sm leading-relaxed">
          Pour savoir si les lecteurs reviennent, votre navigateur garde dans
          son stockage local (localStorage, jamais envoyé au serveur) trois
          informations : le jour de votre première visite, celui de la dernière,
          et si un retour à 7 ou 28 jours a déjà été compté. Le serveur reçoit
          seulement « nouvelle visite », « visite de retour » ou « retour dans
          les 7 / 28 jours d&apos;une première visite du JJ/MM », ajoutés à un
          compteur du jour. Ces dates sont oubliées au bout de 13 mois.
        </p>
        <p className="text-white/70 text-sm leading-relaxed">
          Si votre navigateur envoie le signal Global Privacy Control, rien
          n&apos;est mesuré. Vous pouvez aussi désactiver la mesure ici ; les
          dates déjà stockées sont alors effacées.
        </p>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <MeasureToggle />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-white font-semibold">Formulaire « Quelle statistique cherchez-vous ? »</h2>
        <p className="text-white/70 text-sm leading-relaxed">
          Le <Link href="/fr/demande" className="underline hover:text-white transition-colors">formulaire de demande</Link>{" "}
          enregistre une catégorie, un texte libre facultatif (280 caractères
          au plus) et la page d&apos;où vous venez, avec la date. Il ne demande
          ni nom ni e-mail et refuse les textes contenant une adresse e-mail.
          Les demandes sont effacées au bout de 12 mois.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-white font-semibold">Hébergement des données</h2>
        <p className="text-white/70 text-sm leading-relaxed">
          Les compteurs agrégés et les demandes sont hébergés dans la même base de données que
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
        <p className="text-white/40 text-xs">Dernière mise à jour : octobre 2026</p>
      </section>
    </div>
  );
}
