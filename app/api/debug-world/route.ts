import { NextResponse } from "next/server";
import { scrapeWorldPrices, upsertWorldPrices } from "@/lib/world-scraper";
export const dynamic = "force-dynamic";
export async function GET() {
  const result = await scrapeWorldPrices();
  if (!result.success) return NextResponse.json({ scrape_error: result.error });
  const london = result.data.filter(p => p.exchange === "London");
  const ny = result.data.filter(p => p.exchange === "New York");
  const upsertResult = await upsertWorldPrices(result.data);
  return NextResponse.json({
    total: result.data.length,
    london_count: london.length,
    ny_count: ny.length,
    london_data: london,
    upsert: upsertResult
  });
}
