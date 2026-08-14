import type { Lang } from './lang';

/**
 * The contract every dictionary in the app satisfies.
 *
 * Always annotate it explicitly:
 *
 * ```ts
 * const DICT: Dict<{ save: string; imported: (n: number) => string }> = {
 *   en: { save: 'Save', imported: (n) => `Imported ${n} notes` },
 *   id: { save: 'Simpan', imported: (n) => `${n} catatan diimpor` }
 * };
 * ```
 *
 * The annotation is the whole safety mechanism. Without it TypeScript infers the
 * shape from whichever locale is written first, and a key missing from the other
 * one is merely a narrower type rather than an error — which is how a
 * half-translated screen reaches a user. With it, `bun run check` fails and names
 * the missing key.
 *
 * Interpolation and counts are plain functions rather than a message format.
 * English needs two plural forms and Indonesian needs one, and a function
 * expresses that difference directly:
 *
 * ```ts
 * en: { peers: (n) => (n === 1 ? '1 other' : `${n} others`) },
 * id: { peers: (n) => `${n} orang lain` }
 * ```
 */
export type Dict<T> = Record<Lang, T>;
