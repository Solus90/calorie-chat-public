import type { NutritionCandidate } from "./types";

const FDC_BASE = "https://api.nal.usda.gov/fdc/v1";
const ENERGY_NUTRIENT_ID = 1008;

type FdcNutrient = {
  nutrientId?: number;
  nutrientName?: string;
  unitName?: string;
  value?: number;
};

type FdcFood = {
  fdcId?: number;
  description?: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: FdcNutrient[];
};

type FdcSearchResponse = {
  foods?: FdcFood[];
};

function energyKcal(nutrients: FdcNutrient[] | undefined): number | undefined {
  if (!nutrients) return undefined;
  const hit = nutrients.find(
    (n) =>
      n.nutrientId === ENERGY_NUTRIENT_ID &&
      n.unitName?.toUpperCase() === "KCAL" &&
      typeof n.value === "number",
  );
  return hit?.value;
}

function parseUsdaFood(food: FdcFood): NutritionCandidate | null {
  const kcal = energyKcal(food.foodNutrients);
  if (kcal == null || !food.fdcId || !food.description) return null;

  const servingG =
    food.servingSizeUnit?.toLowerCase() === "g" && food.servingSize
      ? food.servingSize
      : undefined;

  const isPer100g =
    food.dataType === "Foundation" ||
    food.dataType === "SR Legacy" ||
    food.dataType === "Survey (FNDDS)" ||
    !servingG;

  let caloriesPer100g: number | undefined;
  let caloriesPerServing: number | undefined;

  if (isPer100g) {
    caloriesPer100g = Math.round(kcal);
    if (servingG) {
      caloriesPerServing = Math.round((kcal / 100) * servingG);
    }
  } else if (servingG) {
    caloriesPerServing = Math.round(kcal);
    caloriesPer100g = Math.round((kcal / servingG) * 100);
  } else {
    caloriesPerServing = Math.round(kcal);
  }

  const servingParts: string[] = [];
  if (food.householdServingFullText) {
    servingParts.push(food.householdServingFullText);
  }
  if (servingG) {
    servingParts.push(`${servingG}g`);
  }

  const brand = food.brandName || food.brandOwner;

  return {
    source: "usda",
    name: food.description,
    brand: brand || undefined,
    dataType: food.dataType,
    caloriesPer100g,
    caloriesPerServing,
    servingDescription: servingParts.length ? servingParts.join(" · ") : undefined,
    servingSizeG: servingG,
    externalId: String(food.fdcId),
  };
}

/** Search USDA FoodData Central. Returns [] when key is missing or the request fails. */
export async function searchUsda(
  query: string,
  limit = 4,
): Promise<{ candidates: NutritionCandidate[]; skipped: boolean }> {
  const apiKey = process.env.USDA_API_KEY?.trim();
  if (!apiKey) {
    return { candidates: [], skipped: true };
  }

  const url = new URL(`${FDC_BASE}/foods/search`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", String(Math.min(limit, 10)));
  url.searchParams.set("dataType", "Foundation,SR Legacy,Survey (FNDDS),Branded");

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return { candidates: [], skipped: false };

    const data = (await res.json()) as FdcSearchResponse;
    const candidates: NutritionCandidate[] = [];
    for (const food of data.foods ?? []) {
      const parsed = parseUsdaFood(food);
      if (parsed) candidates.push(parsed);
      if (candidates.length >= limit) break;
    }
    return { candidates, skipped: false };
  } catch {
    return { candidates: [], skipped: false };
  }
}
