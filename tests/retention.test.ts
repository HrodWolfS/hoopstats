import { describe, expect, it } from "vitest";
import { nextVisit, parseVisitState, retentionRate, type VisitState } from "@/lib/retention";
import { sanitizeAnalyticsDimension } from "@/lib/analytics";
import { validateStatRequest } from "@/lib/stat-requests";

function visit(state: VisitState | null, day: string) {
  const result = nextVisit(state, day);
  return { state: parseVisitState(JSON.stringify(result.state)), events: result.events };
}

describe("retour des visiteurs", () => {
  it("compte J7 puis J28 une seule fois sur un parcours complet", () => {
    let state: VisitState | null = null;
    const sent: string[] = [];
    for (const day of ["2026-10-01", "2026-10-01", "2026-10-02", "2026-10-07", "2026-10-09", "2026-10-29", "2026-10-30"]) {
      const result = visit(state, day);
      state = result.state;
      sent.push(...result.events.map((e) => `${e.event}/${e.dimension}`));
    }
    expect(sent).toEqual([
      "visit/new",
      "visit/returning",
      "return/j7-20261001",
      "visit/returning",
      "visit/returning",
      "return/j28-20261001",
      "visit/returning",
      "visit/returning",
    ]);
    for (const entry of sent) expect(sanitizeAnalyticsDimension(entry.split("/")[1])).not.toBeNull();
  });

  it("ignore les cohortes dont la fenêtre n'est pas close", () => {
    const rows = [
      { day: new Date("2026-09-10T00:00:00Z"), event: "visit", dimension: "new", count: 10 },
      { day: new Date("2026-09-25T00:00:00Z"), event: "return", dimension: "j28-20260910", count: 3 },
      { day: new Date("2026-09-20T00:00:00Z"), event: "visit", dimension: "new", count: 50 },
    ];
    expect(retentionRate(rows, "j28", "2026-10-10")).toMatchObject({ cohort: 10, returned: 3, rate: 30 });
  });
});

describe("demandes de statistiques", () => {
  it("refuse une adresse e-mail et accepte un texte normal", () => {
    expect(validateStatRequest({ category: "autre", text: "contact: moi@gmail.com" }).ok).toBe(false);
    expect(validateStatRequest({ category: "tirs", text: "Zones de tir de Sarr" }).ok).toBe(true);
  });
});
