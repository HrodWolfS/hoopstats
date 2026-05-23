import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ background: "#0a0a0f" }}
    >
      <p className="font-display text-[8rem] leading-none font-semibold text-white/10 select-none">
        404
      </p>
      <h1 className="mt-4 text-2xl font-semibold text-white">
        Page introuvable
      </h1>
      <p className="mt-2 text-white/50 text-sm max-w-xs">
        Cette page n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/fr"
        className="mt-8 inline-block rounded-lg bg-violet-600 px-6 py-3 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
