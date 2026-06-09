import { NextResponse } from "next/server";
import { lookupByBarcode } from "@/lib/nutrition/openfoodfacts";
import { getActiveProfileId } from "@/lib/profile";
import { upsertScannedProduct } from "@/lib/queries";

export const dynamic = "force-dynamic";

const BARCODE_RE = /^\d{8,14}$/;

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code") ?? "";
  if (!BARCODE_RE.test(code)) {
    return NextResponse.json({ error: "Invalid barcode" }, { status: 400 });
  }

  const product = await lookupByBarcode(code);
  if (!product) {
    return NextResponse.json({ found: false });
  }

  const parts = [product.brand, product.name].filter(Boolean);
  const description = parts.join(" — ");

  const calories =
    product.caloriesPerServing ??
    (product.caloriesPer100g != null && product.servingSizeG != null
      ? Math.round((product.caloriesPer100g / 100) * product.servingSizeG)
      : null);

  if (calories != null) {
    try {
      const profileId = await getActiveProfileId();
      await upsertScannedProduct(profileId, {
        barcode: code,
        name: description,
        calories,
        serving: product.servingDescription ?? null,
      });
    } catch {
      // Best-effort — never fail the response over persistence
    }
  }

  return NextResponse.json({
    found: true,
    description,
    calories,
    serving: product.servingDescription ?? null,
  });
}
