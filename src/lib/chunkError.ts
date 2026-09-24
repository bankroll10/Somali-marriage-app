/**
 * Did a screen fail to load, rather than fail to render?
 *
 * Every screen past Welcome is a lazy chunk (docs/DESIGN.md), and the
 * app shell now loads offline (src/lib/serviceWorker.ts, docs/DESIGN.md). Put
 * together, a member with no signal can open a screen whose chunk never
 * reached her phone, and the dynamic import rejects. That used to land on the
 * generic error screen, whose second button — "Start completely fresh" —
 * erases every key on the device, the kept-map code included: a dropped
 * signal steering her toward deleting her own map. Found while verifying the
 * STRIDE pass (docs/SECURITY.md, T18).
 *
 * Nothing about her state is wrong when this happens, so nothing about it
 * should be offered for erasing. Each engine words the rejection differently;
 * these are the three, plus Vite's own preload failure.
 */
const CHUNK_FAILURE =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload/i

export function isChunkLoadError(error: unknown): boolean {
  return error instanceof Error && CHUNK_FAILURE.test(error.message)
}
