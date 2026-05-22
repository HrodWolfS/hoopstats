export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="text-white/40 text-sm font-mono">
      Team — {slug} — TODO (Sprint 3)
    </div>
  );
}
