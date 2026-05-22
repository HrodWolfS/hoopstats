export default async function PlayerPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="text-white/40 text-sm font-mono">
      Joueur — {slug} — TODO (Sprint 4)
    </div>
  );
}
