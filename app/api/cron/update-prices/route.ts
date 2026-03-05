/**
 * app/api/cron/update-prices/route.ts
 * Chạy lúc 11:15 SA giờ Việt Nam (04:15 UTC)
 * Chỉ crawl giá + upsert DB, KHÔNG viết bài
 */
import { NextRequest, NextResponse } from "next/server";
import { scrapeCoffeePrices }        from "@/lib/scraper";
import { upsertCoffeePrices }        from "@/lib/db-updater";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const start = Date.now();
  const auth  = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized — Thiếu hoặc sai CRON_SECRET" }, { status: 401 });
  }

  const scrapeResult = await scrapeCoffeePrices();
  if (!scrapeResult.success || scrapeResult.data.length === 0) {
    return NextResponse.json(
      { success: false, step: "scrape", error: scrapeResult.error, duration: `${Date.now()-start}ms`, timestamp: new Date().toISOString() },
      { status: 422 }
    );
  }

  const dbResult = await upsertCoffeePrices(scrapeResult.data);
  if (!dbResult.success) {
    return NextResponse.json(
      { success: false, step: "database", errors: dbResult.errors, duration: `${Date.now()-start}ms`, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success:   true,
    scraped:   scrapeResult.data.length,
    upserted:  dbResult.upserted,
    skipped:   dbResult.skipped,
    warnings:  dbResult.errors,
    provinces: scrapeResult.data.map(p => p.province),
    duration:  `${Date.now()-start}ms`,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) { return GET(request); }
