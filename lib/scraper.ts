/**
 * lib/scraper.ts
 *
 * Crawler lấy giá cà phê từ giacaphe.com
 * Dùng cheerio (HTML parser nhẹ) — không cần browser, chạy tốt trên Vercel Free.
 *
 * Cài đặt: npm install cheerio
 */

import * as cheerio from "cheerio";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface ScrapedPrice {
  region:       string;   // "Đắk Lắk", "Gia Lai", ...
  price:        number;   // 96000
  change_value: number;   // -200, 0, +500
  source_url:   string;   // URL nguồn để audit
  scraped_at:   string;   // ISO timestamp
}

export interface ScrapeResult {
  success: boolean;
  data:    ScrapedPrice[];
  error:   string | null;
  html_snapshot?: string;  // Lưu HTML để debug khi cấu trúc trang thay đổi
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const SOURCE_URL = "https://giacaphe.com/gia-ca-phe-noi-dia/";

// Timeout 10s — Vercel Serverless tối đa 10s trên Free tier
const FETCH_TIMEOUT_MS = 10_000;

// Danh sách tỉnh hợp lệ — dùng để validate kết quả crawl
const VALID_REGIONS = new Set([
  "Đắk Lắk", "Gia Lai", "Lâm Đồng", "Đắk Nông",
  "Kon Tum", "Bình Phước", "Đồng Nai", "Bà Rịa - Vũng Tàu",
]);

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Chuẩn hoá chuỗi giá → số nguyên
 * "96.000"  → 96000
 * "96,000"  → 96000
 * "96000đ"  → 96000
 * "96.000 đ/kg" → 96000
 */
function parsePrice(raw: string): number {
  const cleaned = raw
    .replace(/[^\d.,]/g, "")   // bỏ mọi ký tự không phải số/dấu
    .replace(/\./g, "")         // bỏ dấu chấm phân cách nghìn
    .replace(/,/g, "");         // bỏ dấu phẩy
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Chuẩn hoá chuỗi biến động → số có dấu
 * "+200"   → 200
 * "-1.000" → -1000
 * "—"      → 0
 * ""       → 0
 */
function parseChange(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "—" || trimmed === "-" || trimmed === "0") return 0;
  const isNegative = trimmed.startsWith("-");
  const cleaned = trimmed
    .replace(/[^\d.]/g, "")
    .replace(/\./g, "");
  const num = parseInt(cleaned, 10);
  if (isNaN(num)) return 0;
  return isNegative ? -num : num;
}

/**
 * Chuẩn hoá tên tỉnh — xử lý encoding khác nhau
 * "Dak Lak" → "Đắk Lắk"
 * "ĐắkLắk"  → "Đắk Lắk"
 */
function normalizeRegion(raw: string): string {
  const map: Record<string, string> = {
    "dak lak":      "Đắk Lắk",
    "daklak":       "Đắk Lắk",
    "đắk lắk":      "Đắk Lắk",
    "gia lai":      "Gia Lai",
    "gialai":       "Gia Lai",
    "lam dong":     "Lâm Đồng",
    "lamdong":      "Lâm Đồng",
    "lâm đồng":     "Lâm Đồng",
    "dak nong":     "Đắk Nông",
    "daknong":      "Đắk Nông",
    "đắk nông":     "Đắk Nông",
    "kon tum":      "Kon Tum",
    "kontum":       "Kon Tum",
    "binh phuoc":   "Bình Phước",
    "bình phước":   "Bình Phước",
    "dong nai":     "Đồng Nai",
    "đồng nai":     "Đồng Nai",
    "ba ria vung tau": "Bà Rịa - Vũng Tàu",
    "bà rịa - vũng tàu": "Bà Rịa - Vũng Tàu",
  };

  const key = raw.toLowerCase().trim();
  return map[key] ?? raw.trim();
}

// ─────────────────────────────────────────────
// STRATEGY 1 — Parse bảng HTML truyền thống
// <table> → <tr> → <td>
// ─────────────────────────────────────────────

function parseTable($: cheerio.CheerioAPI): ScrapedPrice[] {
  const results: ScrapedPrice[] = [];
  const now = new Date().toISOString();

  // Tìm tất cả table trên trang — thử từng cái
  $("table").each((_, table) => {
    $(table)
      .find("tr")
      .each((_, row) => {
        const cells = $(row).find("td");
        if (cells.length < 2) return; // bỏ qua header hoặc row không đủ cột

        const regionRaw = $(cells[0]).text().trim();
        const priceRaw  = $(cells[1]).text().trim();
        // Cột biến động có thể là cột 2 hoặc 3 tuỳ trang
        const changeRaw = cells.length >= 3
          ? $(cells[2]).text().trim()
          : "0";

        const region = normalizeRegion(regionRaw);
        const price  = parsePrice(priceRaw);

        // Bỏ qua nếu không phải tỉnh hợp lệ hoặc giá vô lý
        if (!VALID_REGIONS.has(region)) return;
        if (price < 10_000 || price > 200_000) return;

        results.push({
          region,
          price,
          change_value: parseChange(changeRaw),
          source_url:   SOURCE_URL,
          scraped_at:   now,
        });
      });
  });

  return results;
}

// ─────────────────────────────────────────────
// STRATEGY 2 — Fallback: tìm theo CSS class/pattern
// Dùng khi trang dùng div thay vì table
// ─────────────────────────────────────────────

function parseDivFallback($: cheerio.CheerioAPI): ScrapedPrice[] {
  const results: ScrapedPrice[] = [];
  const now = new Date().toISOString();

  // Thử các selector phổ biến của trang tin tức VN
  const selectors = [
    ".price-table tr",
    ".gia-ca-phe tr",
    ".entry-content table tr",
    "article table tr",
    ".post-content table tr",
  ];

  for (const selector of selectors) {
    $(selector).each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 2) return;

      const regionRaw = $(cells[0]).text().trim();
      const priceRaw  = $(cells[1]).text().trim();
      const changeRaw = cells.length >= 3 ? $(cells[2]).text().trim() : "0";

      const region = normalizeRegion(regionRaw);
      const price  = parsePrice(priceRaw);

      if (!VALID_REGIONS.has(region)) return;
      if (price < 10_000 || price > 200_000) return;

      results.push({
        region,
        price,
        change_value: parseChange(changeRaw),
        source_url:   SOURCE_URL,
        scraped_at:   now,
      });
    });

    if (results.length > 0) break; // tìm thấy rồi, dừng
  }

  return results;
}

// ─────────────────────────────────────────────
// MAIN SCRAPER
// ─────────────────────────────────────────────

export async function scrapeCoffeePrices(): Promise<ScrapeResult> {
  // ── 1. Fetch HTML ────────────────────────────
  let html: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(SOURCE_URL, {
      signal: controller.signal,
      headers: {
        // Giả lập browser để tránh bị chặn bot
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/120.0.0.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8",
        "Cache-Control": "no-cache",
      },
      // Next.js 15: tắt cache để luôn lấy data mới nhất
      cache: "no-store",
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${response.statusText} — URL: ${SOURCE_URL}`
      );
    }

    html = await response.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi kết nối không xác định";
    return { success: false, data: [], error: `Fetch thất bại: ${message}` };
  }

  // ── 2. Parse HTML với cheerio ────────────────
  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch (err) {
    return {
      success: false,
      data: [],
      error: "Không thể parse HTML",
      html_snapshot: html.substring(0, 500),
    };
  }

  // ── 3. Thử Strategy 1 (table) ───────────────
  let prices = parseTable($);

  // ── 4. Fallback sang Strategy 2 (div/class) ─
  if (prices.length === 0) {
    prices = parseDivFallback($);
  }

  // ── 5. Không tìm thấy gì → lưu snapshot HTML để debug ──
  if (prices.length === 0) {
    return {
      success: false,
      data: [],
      error:
        "Không tìm thấy bảng giá trong HTML. " +
        "Trang nguồn có thể đã thay đổi cấu trúc.",
      // Lưu 2000 ký tự đầu để xem cấu trúc trang
      html_snapshot: html.substring(0, 2000),
    };
  }

  // ── 6. Loại bỏ duplicate cùng tỉnh ─────────
  const unique = Array.from(
    new Map(prices.map((p) => [p.region, p])).values()
  );

  return { success: true, data: unique, error: null };
}
