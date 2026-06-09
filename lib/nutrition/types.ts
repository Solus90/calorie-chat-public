export type NutritionSource = "usda" | "openfoodfacts";

/** Normalized hit from USDA FDC or Open Food Facts. */
export type NutritionCandidate = {
  source: NutritionSource;
  name: string;
  brand?: string;
  /** USDA data type (Foundation, SR Legacy, Branded, …) when applicable */
  dataType?: string;
  caloriesPer100g?: number;
  caloriesPerServing?: number;
  servingDescription?: string;
  /** grams when known */
  servingSizeG?: number;
  externalId: string;
};

export type NutritionLookupResult = {
  query: string;
  candidates: NutritionCandidate[];
  /** USDA skipped because USDA_API_KEY is unset */
  usda_skipped?: boolean;
  /** Hint for the model when both APIs return nothing useful */
  fallback_recommended: boolean;
};
