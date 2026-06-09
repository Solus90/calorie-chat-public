import type { NutritionCandidate } from "./types";

const OFF_SEARCH = "https://world.openfoodfacts.org/cgi/search.pl";
const OFF_USER_AGENT =
  process.env.OFF_USER_AGENT?.trim() ||
  "CalorieChat/1.0";

type OffNutriments = {
  "energy-kcal_100g"?: number;
  "energy-kcal"?: number;
  "energy-kcal_serving"?: number;
  energy_kcal_100g?: number;
};

type OffProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number;
  nutriments?: OffNutriments;
};

type OffSearchResponse = {
  products?: OffProduct[];
};

function offKcalPer100g(n: OffNutriments | undefined): number | undefined {
  if (!n) return undefined;
  const v = n["energy-kcal_100g"] ?? n.energy_kcal_100g;
  return typeof v === "number" && v > 0 ? v : undefined;
}

function offKcalPerServing(n: OffNutriments | undefined): number | undefined {
  if (!n) return undefined;
  const v = n["energy-kcal_serving"] ?? n["energy-kcal"];
  return typeof v === "number" && v > 0 ? v : undefined;
}

function parseOffProduct(product: OffProduct): NutritionCandidate | null {
  if (!product.code) return null;
  const name = product.product_name?.trim();
  if (!name) return null;

  const per100g = offKcalPer100g(product.nutriments);
  const perServing = offKcalPerServing(product.nutriments);
  if (per100g == null && perServing == null) return null;

  let servingSizeG: number | undefined;
  if (typeof product.serving_quantity === "number" && product.serving_quantity > 0) {
    servingSizeG = product.serving_quantity;
  }

  return {
    source: "openfoodfacts",
    name,
    brand: product.brands?.split(",")[0]?.trim() || undefined,
    caloriesPer100g: per100g != null ? Math.round(per100g) : undefined,
    caloriesPerServing:
      perServing != null
        ? Math.round(perServing)
        : per100g != null && servingSizeG
          ? Math.round((per100g / 100) * servingSizeG)
          : undefined,
    servingDescription: product.serving_size?.trim() || undefined,
    servingSizeG,
    externalId: product.code,
  };
}

/** Look up a product by barcode (EAN/UPC) using OFF v2 API. Returns null if not found. */
export async function lookupByBarcode(
  barcode: string,
): Promise<NutritionCandidate | null> {
  const fields = "product_name,brands,nutriments,serving_size,serving_quantity";
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}?fields=${fields}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": OFF_USER_AGENT },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { status: number; product?: OffProduct };
    if (data.status !== 1 || !data.product) return null;
    return parseOffProduct({ ...data.product, code: barcode });
  } catch {
    return null;
  }
}

/** Search Open Food Facts (v1 full-text). Returns [] on failure. */
export async function searchOpenFoodFacts(
  query: string,
  limit = 4,
): Promise<NutritionCandidate[]> {
  const url = new URL(OFF_SEARCH);
  url.searchParams.set("search_terms", query);
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", String(Math.min(limit, 10)));
  url.searchParams.set(
    "fields",
    "code,product_name,brands,nutriments,serving_size,serving_quantity",
  );

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": OFF_USER_AGENT },
      cache: "no-store",
    });
    if (!res.ok) return [];

    const data = (await res.json()) as OffSearchResponse;
    const candidates: NutritionCandidate[] = [];
    for (const product of data.products ?? []) {
      const parsed = parseOffProduct(product);
      if (parsed) candidates.push(parsed);
      if (candidates.length >= limit) break;
    }
    return candidates;
  } catch {
    return [];
  }
}
