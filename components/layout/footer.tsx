export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] mt-auto py-6 px-8 lg:px-12">
      <div className="max-w-[1400px] mx-auto space-y-2 text-[11px] text-white/30 leading-relaxed">
        <p>
          Logos et marques NBA sont la propriété de leurs détenteurs respectifs.
          hoopstats les utilise dans un contexte éditorial et de référence.
        </p>
        <p>
          Photos sous licence Creative Commons. Attributions disponibles sur
          chaque page joueur.
        </p>
        <p>
          © {new Date().getFullYear()} hoopstats —{" "}
          <a
            href="mailto:contact@hoopstats.fr"
            className="hover:text-white/60 transition"
          >
            Contact
          </a>
        </p>
      </div>
    </footer>
  );
}
