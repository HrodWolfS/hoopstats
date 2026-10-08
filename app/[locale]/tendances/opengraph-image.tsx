import { OG_SIZE } from "@/components/og/stat-card";
import { trendsCard } from "@/components/og/trends-card";

export const revalidate = 21600;
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Tendances NBA hoopstats : joueurs en forme, écart à la moyenne de saison et date des matchs";

export default async function Image({ params }: { params: Promise<{ saison?: string }> }) {
  const { saison } = await params;
  return trendsCard(saison);
}
