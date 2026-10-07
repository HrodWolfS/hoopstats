import { describe, expect, it } from "vitest";
import { isPilotageAuthorized, isPilotagePath } from "@/lib/pilotage-auth";

function basic(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

describe("accès au pilotage", () => {
  it("reste fermé en production sans mot de passe configuré", () => {
    expect(isPilotageAuthorized(null, undefined, "production")).toBe(false);
    expect(isPilotageAuthorized(basic("a", ""), "", "production")).toBe(false);
  });

  it("n'est ouvert sans mot de passe qu'au serveur de développement", () => {
    expect(isPilotageAuthorized(null, undefined, "development")).toBe(true);
    expect(isPilotageAuthorized(null, undefined, "test")).toBe(false);
  });

  it("exige le bon mot de passe, quel que soit l'utilisateur", () => {
    expect(isPilotageAuthorized(basic("moi", "sim-local"), "sim-local", "production")).toBe(true);
    expect(isPilotageAuthorized(basic("", "sim-local"), "sim-local", "production")).toBe(true);
    expect(isPilotageAuthorized(basic("moi", "faux"), "sim-local", "production")).toBe(false);
    expect(isPilotageAuthorized(null, "sim-local", "production")).toBe(false);
  });

  it("garde un mot de passe configuré même en développement", () => {
    expect(isPilotageAuthorized(null, "sim-local", "development")).toBe(false);
  });

  it("accepte les deux-points dans le mot de passe et refuse un en-tête mal formé", () => {
    expect(isPilotageAuthorized(basic("u", "a:b"), "a:b", "production")).toBe(true);
    expect(isPilotageAuthorized("Bearer sim-local", "sim-local", "production")).toBe(false);
    expect(
      isPilotageAuthorized(`Basic ${Buffer.from("sans-separateur").toString("base64")}`, "sans-separateur", "production"),
    ).toBe(false);
  });

  it("couvre la page et ses sous-chemins, pas les adresses voisines", () => {
    expect(isPilotagePath("/fr/pilotage")).toBe(true);
    expect(isPilotagePath("/fr/pilotage/x")).toBe(true);
    expect(isPilotagePath("/fr/pilotages")).toBe(false);
    expect(isPilotagePath("/fr/joueurs")).toBe(false);
  });
});
