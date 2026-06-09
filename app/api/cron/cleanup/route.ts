import { NextResponse } from "next/server";
import { deleteOldScans } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const deleted = await deleteOldScans();
  return NextResponse.json({ ok: true, deleted });
}
