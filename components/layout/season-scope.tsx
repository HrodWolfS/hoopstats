"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import type { SeasonScope as Scope } from "@/lib/season-scope";

const SeasonScopeContext = createContext<{
  scope: Scope | null;
  setScope: React.Dispatch<React.SetStateAction<Scope | null>>;
}>({ scope: null, setScope: () => {} });

export function SeasonScopeProvider({ children }: { children: React.ReactNode }) {
  const [scope, setScope] = useState<Scope | null>(null);
  return <SeasonScopeContext.Provider value={{ scope, setScope }}>{children}</SeasonScopeContext.Provider>;
}

const subscribeNothing = () => () => {};

/**
 * Périmètre déclaré par la page. Pendant l'hydratation, toujours `null` comme
 * au rendu serveur : la page, hydratée avant l'en-tête (Suspense), a pu
 * déjà le transmettre, et l'en-tête ne correspondrait plus au HTML reçu.
 */
export function useSeasonScope(): Scope | null {
  const scope = useContext(SeasonScopeContext).scope;
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  return hydrated ? scope : null;
}

/**
 * Transmet au sélecteur de l'en-tête le périmètre de saison de la page.
 * À rendre une fois par page qui dépend d'une saison ; ne rend rien.
 */
export function SeasonScope({ seasons, season, defaultSeason, pathTemplate }: Scope) {
  const { setScope } = useContext(SeasonScopeContext);
  const key = `${seasons.join(",")}|${season}|${defaultSeason}|${pathTemplate ?? ""}`;

  useEffect(() => {
    const mine: Scope = { seasons, season, defaultSeason, pathTemplate };
    setScope(mine);
    // La page suivante a pu déclarer le sien entre-temps : on ne l'efface pas.
    return () => setScope((current) => (current === mine ? null : current));
    // `key` résume les props : un nouveau tableau à chaque rendu ne relance pas l'effet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setScope]);

  return null;
}
