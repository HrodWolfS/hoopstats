/**
 * Photos des images de partage. Une photo distante qui échoue ferait échouer
 * toute l'image : on la charge nous-mêmes, avec délai court et taille plafonnée,
 * et l'image se dessine sans photo à défaut.
 */

const PHOTO_TIMEOUT_MS = 3000;
const MAX_PHOTO_BYTES = 2_000_000;
/** Largeur standard des vignettes Wikimedia (les largeurs libres sont limitées). */
const WIKIMEDIA_THUMB_WIDTH = 500;

/**
 * Vignette Wikimedia à la place de l'original : certains originaux pèsent
 * plusieurs Mo (9 Mo pour Dončić) et dépassent ce que le moteur d'images accepte.
 */
export function wikimediaThumbUrl(url: string, width = WIKIMEDIA_THUMB_WIDTH): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.host !== "upload.wikimedia.org") return url;

  const thumb = parsed.pathname.match(/^(\/wikipedia\/[^/]+\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/[^/]+)\/\d+px-([^/]+)$/);
  if (thumb) {
    parsed.pathname = `${thumb[1]}/${width}px-${thumb[2]}`;
    return parsed.toString();
  }

  const original = parsed.pathname.match(/^\/wikipedia\/([^/]+)\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+)$/);
  if (!original) return url;
  const [, project, hash, file] = original;
  parsed.pathname = `/wikipedia/${project}/thumb/${hash}/${file}/${width}px-${file}`;
  return parsed.toString();
}

export async function photoDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url || url.toLowerCase().endsWith(".svg")) return null;
  try {
    const response = await fetch(wikimediaThumbUrl(url), {
      signal: AbortSignal.timeout(PHOTO_TIMEOUT_MS),
      headers: { "User-Agent": "hoopstats/1.0 (image de partage)" },
    });
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !/^image\/(png|jpe?g|webp)/.test(type)) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_PHOTO_BYTES) return null;
    return `data:${type};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}
