/**
 * app/api/cron/update-prices/route.ts
 * Crawl giá nội địa + thế giới song song — ghi log sau mỗi lần chạy
 */
import { NextRequest, NextResponse }             from "next/server";
import { scrapeCoffeePrices }                    from "@/lib/scraper";
import { upsertCoffeePrices }                    from "@/lib/db-updater";
import { scrapeWorldPrices, upsertWorldPrices }  from "@/lib/world-scraper";
import { writeLog }                              from "@/lib/crawler-logger";

export const maxDuration = 60;
export const dynamic     = "force-dynamic";

export async function GET(request: NextRequest) {
  const start  = Date.now();
  const auth   = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Chạy song song ──
  const [scrapeResult, worldResult] = await Promise.allSettled([
    scrapeCoffeePrices(),
    scrapeWorldPrices(),
  ]);

  const domestic = scrapeResult.status === "fulfilled" ? scrapeResult.value : null;
  const world    = worldResult.status  === "fulfilled" ? worldResult.value  : null;
  const duration = Date.now() - start;

  // ── Upsert + log giá nội địa ──
  let domesticDb = { success: false, upserted: 0, skipped: 0 };
  if (domestic?.success && domestic.data.length > 0) {
    domesticDb = await upsertCoffeePrices(domestic.data);
    await writeLog({
      task_name:   "Giá nội địa",
      status:      domesticDb.success ? "success" : "failed",
      message:     domesticDb.success
        ? `Cập nhật ${domesticDb.upserted} tỉnh, bỏ qua ${domesticDb.skipped} tỉnh không đổi`
        : "Upsert thất bại",
      records:     domesticDb.upserted,
      duration_ms: duration,
    });
  } else {
    await writeLog({
      task_name:   "Giá nội địa",
      status:      "failed",
      message:     domestic?.error ?? "Scrape thất bại",
      records:     0,
      duration_ms: duration,
    });
  }

  // ── Upsert + log giá thế giới ──
  let worldDb = { success: false, upserted: 0 };
  if (world?.success && world.data.length > 0) {
    worldDb = await upsertWorldPrices(world.data);
    const londonCount  = world.data.filter(p => p.exchange === "London").length;
    const nyCount      = world.data.filter(p => p.exchange === "New York").length;
    await writeLog({
      task_name:   "Giá thế giới",
      status:      worldDb.success ? "success" : "failed",
      message:     worldDb.success
        ? `London: ${londonCount} kỳ hạn, New York: ${nyCount} kỳ hạn`
        : "Upsert thất bại",
      records:     worldDb.upserted,
      duration_ms: duration,
    });
  } else {
    await writeLog({
      task_name:   "Giá thế giới",
      status:      "failed",
      message:     world?.error ?? "Scrape thất bại",
      records:     0,
      duration_ms: duration,
    });
  }

  return NextResponse.json({
    success:   true,
    domestic: { scraped: domestic?.data.length ?? 0, upserted: domesticDb.upserted, error: domestic?.error ?? null },
    world:    { scraped: world?.data.length ?? 0,    upserted: worldDb.upserted,    error: world?.error    ?? null },
    duration:  `${duration}ms`,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) { return GET(request); }
