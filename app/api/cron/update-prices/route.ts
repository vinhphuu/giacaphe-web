/**
 * app/api/cron/update-prices/route.ts
 *
 * Route Handler được Vercel Cron gọi mỗi sáng lúc 9:00 giờ VN.
 *
 * Bảo mật:
 *   - Kiểm tra header Authorization: Bearer <CRON_SECRET>
 *   - Vercel tự động thêm header này khi chạy Cron Job
 *   - Người ngoài không có CRON_SECRET → trả 401
 *
 * Luồng xử lý:
 *   1. Xác thực request
 *   2. Crawl HTML từ giacaphe.com
 *   3. Parse bảng giá với cheerio
 *   4. Upsert vào Supabase
 *   5. Trả response JSON có log đầy đủ
 */

import { NextRequest, NextResponse } from "next/server";
import { scrapeCoffeePrices }         from "@/lib/scraper";
import { upsertCoffeePrices }         from "@/lib/db-updater";

// Vercel Serverless timeout — Free tier max 10s, Pro max 60s
export const maxDuration = 10;

// Không cache response của route này
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────
// GET handler — Vercel Cron dùng GET
// ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // ── BƯỚC 1: Xác thực ─────────────────────────
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[cron] CRON_SECRET chưa được cấu hình trong env vars");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[cron] Unauthorized request từ:", request.headers.get("x-forwarded-for"));
    return NextResponse.json(
      { error: "Unauthorized — Thiếu hoặc sai CRON_SECRET" },
      { status: 401 }
    );
  }

  console.log("[cron] ✅ Authenticated — bắt đầu cập nhật giá...");

  // ── BƯỚC 2: Crawl dữ liệu ────────────────────
  console.log("[cron] 🔍 Đang crawl từ giacaphe.com...");
  const scrapeResult = await scrapeCoffeePrices();

  if (!scrapeResult.success || scrapeResult.data.length === 0) {
    console.error("[cron] ❌ Crawl thất bại:", scrapeResult.error);

    // Log HTML snapshot để debug khi trang thay đổi cấu trúc
    if (scrapeResult.html_snapshot) {
      console.error("[cron] HTML snapshot (500 chars):", scrapeResult.html_snapshot);
    }

    return NextResponse.json(
      {
        success:   false,
        step:      "scrape",
        error:     scrapeResult.error,
        duration:  `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 422 }
    );
  }

  console.log(`[cron] ✅ Crawl thành công: ${scrapeResult.data.length} tỉnh`);
  console.log("[cron] Dữ liệu:", JSON.stringify(scrapeResult.data, null, 2));

  // ── BƯỚC 3: Upsert vào Supabase ─────────────
  console.log("[cron] 💾 Đang upsert vào Supabase...");
  const dbResult = await upsertCoffeePrices(scrapeResult.data);

  const duration = Date.now() - startTime;

  if (!dbResult.success) {
    console.error("[cron] ❌ Upsert thất bại:", dbResult.errors);
    return NextResponse.json(
      {
        success:  false,
        step:     "database",
        errors:   dbResult.errors,
        scraped:  scrapeResult.data.length,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }

  // ── BƯỚC 4: Response thành công ─────────────
  console.log(
    `[cron] ✅ Hoàn thành! Upserted: ${dbResult.upserted}, ` +
    `Skipped: ${dbResult.skipped}, Duration: ${duration}ms`
  );

  return NextResponse.json({
    success:   true,
    scraped:   scrapeResult.data.length,
    upserted:  dbResult.upserted,
    skipped:   dbResult.skipped,
    warnings:  dbResult.errors,  // non-fatal warnings
    regions:   scrapeResult.data.map((d) => d.region),
    duration:  `${duration}ms`,
    timestamp: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────
// POST handler — cho phép test thủ công từ dashboard
// ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // POST dùng cùng logic xác thực, tiện để test bằng curl -X POST
  return GET(request);
}
