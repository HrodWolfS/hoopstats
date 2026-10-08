"use client";

import { useState } from "react";
import { STAT_REQUEST_CATEGORIES, STAT_REQUEST_TEXT_MAX } from "@/lib/stat-requests";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

/**
 * `origin` vient du paramètre `?depuis=` posé par les liens du site
 * (pied de page, recherche sans résultat) ; le serveur ne garde qu'un chemin interne.
 */
export function StatRequestForm({ origin }: { origin: string }) {
  const [category, setCategory] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!category) {
      setStatus({ kind: "error", message: "Choisissez une catégorie." });
      return;
    }
    setStatus({ kind: "sending" });
    const site = new FormData(event.currentTarget).get("site");
    try {
      const response = await fetch("/api/demandes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, text, page: origin, site }),
      });
      if (response.ok) {
        setStatus({ kind: "sent" });
        return;
      }
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus({ kind: "error", message: body?.error ?? "Envoi impossible, réessayez plus tard." });
    } catch {
      setStatus({ kind: "error", message: "Envoi impossible, vérifiez votre connexion." });
    }
  }

  if (status.kind === "sent") {
    return (
      <div role="status" className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5">
        <p className="font-medium text-white">Merci, c’est noté.</p>
        <p className="mt-1 text-sm text-white/50">
          Les demandes les plus fréquentes orientent les prochaines pages de hoopstats.
        </p>
        <button
          type="button"
          onClick={() => {
            setCategory("");
            setText("");
            setStatus({ kind: "idle" });
          }}
          className="mt-4 text-sm text-orange-400 underline-offset-4 hover:underline"
        >
          Faire une autre demande
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-white/80">Catégorie</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {STAT_REQUEST_CATEGORIES.map((entry) => (
            <label
              key={entry.value}
              className="flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-white/[0.06] bg-[#111114] px-4 py-3 text-sm text-white/70 transition-colors has-[:checked]:border-orange-500/50 has-[:checked]:text-white"
            >
              <input
                type="radio"
                name="category"
                value={entry.value}
                checked={category === entry.value}
                onChange={() => setCategory(entry.value)}
                className="accent-orange-500"
              />
              <span className="min-w-0">{entry.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="stat-request-text" className="text-sm font-medium text-white/80">
          Précisez (facultatif)
        </label>
        <textarea
          id="stat-request-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={STAT_REQUEST_TEXT_MAX}
          rows={4}
          placeholder="Ex. : les stats de Wembanyama quand il joue plus de 35 minutes"
          className="w-full resize-y rounded-xl border border-white/[0.08] bg-[#111114] px-4 py-3 text-base text-white placeholder:text-white/25 focus:border-orange-500/50 focus:outline-none sm:text-sm"
        />
        <p className="text-right font-mono text-[11px] text-white/30">
          {text.length} / {STAT_REQUEST_TEXT_MAX}
        </p>
      </div>

      {/* Champ piège pour les robots, caché aux lecteurs et aux lecteurs d'écran. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Site web
          <input type="text" name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {status.kind === "error" && (
        <p role="alert" className="text-sm text-amber-300">
          {status.message}
        </p>
      )}

      <button
        type="submit"
        disabled={status.kind === "sending"}
        className="w-full rounded-xl bg-orange-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-orange-500 disabled:opacity-50 sm:w-auto"
      >
        {status.kind === "sending" ? "Envoi…" : "Envoyer la demande"}
      </button>
    </form>
  );
}
