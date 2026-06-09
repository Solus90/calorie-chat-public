import { searchOpenFoodFacts } from "./openfoodfacts";
import { searchUsda } from "./usda";
import type { NutritionCandidate, NutritionLookupResult } from "./types";

const MAX_CANDIDATES = 5;

/** USDA first, then Open Food Facts; merge up to MAX_CANDIDATES unique hits. */
export async function lookupNutrition(query: string): Promise<NutritionLookupResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: trimmed, candidates: [], fallback_recommended: true };
  }

  const [usda, off] = await Promise.all([
    searchUsda(trimmed, 4),
    searchOpenFoodFacts(trimmed, 4),
  ]);

  const merged: NutritionCandidate[] = [];
  const seen = new Set<string>();

  for (const c of [...usda.candidates, ...off]) {
    const key = `${c.source}:${c.externalId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(c);
    if (merged.length >= MAX_CANDIDATES) break;
  }

  return {
    query: trimmed,
    candidates: merged,
    usda_skipped: usda.skipped,
    fallback_recommended: merged.length === 0,
  };
}
