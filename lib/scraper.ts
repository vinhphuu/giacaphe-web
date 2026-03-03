/**
 * lib/scraper.ts
 *
 * Crawler lấy giá cà phê từ giacaphe.com
 * Dùng ScraperAPI để bypass 403 Forbidden.
 *
 * Cài đặt: npm install cheerio
 * Env vars cần có: SCRAPER_API_KEY
 */

import * as cheerio from "cheerio";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface ScrapedPrice {
  province:     string;   // "Đắk Lắk", "Gia Lai", ...
  price:        number;   // 96000
  change_value: number;   // -200, 0, +500
  source_url:   string;
  scraped_at:   string;   // ISO timestamp
}

export interface ScrapeResult {
  success:        boolean;
  data:           ScrapedPrice[];
  error:          string | null;
  html_snapshot?: string;
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const TARGET_URL    = "https://giacaphe.com/gia-ca-phe-noi-dia/";
const FETCH_TIMEOUT = 30_000; // ScraperAPI cần 10-30s

const VALID_PROVINCES = new Set([
  "Đắk Lắk", "Gia Lai", "Lâm Đồng", "Đắk Nông",
  "Kon Tum",  "Bình Phước", "Đồng Nai", "Bà Rịa - Vũng Tàu",
]);

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function parsePrice(raw: string): number {
  const cleaned = raw.replace(/[^\d]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

function parseChange(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed || ["—", "-", "0", ""].includes(trimmed)) return 0;
  const isNeg = trimmed.startsWith("-");
  const num = parseInt(trimmed.replace(/[^\d]/g, ""), 10);
  if (isNaN(num)) return 0;
  return isNeg ? -num : num;
}

function normalizeProvince(raw: string): string {
  const map: Record<string, string> = {
    "dak lak":               "Đắk Lắk",
    "daklak":                "Đắk Lắk",
    "đắk lắk":               "Đắk Lắk",
    "dak lắk":               "Đắk Lắk",
    "gia lai":               "Gia Lai",
    "gialai":                "Gia Lai",
    "lam dong":              "Lâm Đồng",
    "lamdong":               "Lâm Đồng",
    "lâm đồng":              "Lâm Đồng",
    "dak nong":              "Đắk Nông",
    "daknong":               "Đắk Nông",
    "đắk nông":              "Đắk Nông",
    "kon tum":               "Kon Tum",
    "kontum":                "Kon Tum",
    "binh phuoc":            "Bình Phước",
    "bình phước":            "Bình Phước",
    "dong nai":              "Đồng Nai",
    "đồng nai":              "Đồng Nai",
    "ba ria vung tau":       "Bà Rịa - Vũng Tàu",
    "bà rịa - vũng tàu":    "Bà Rịa - Vũng Tàu",
    "bà rịa vũng tàu":      "Bà Rịa - Vũng Tàu",
  };
  return map[raw.toLowerCase().trim()] ?? raw.trim();
}

// ─────────────────────────────────────────────
// PARSE HTML
// ─────────────────────────────────────────────

function parseHtml($: cheerio.CheerioAPI): ScrapedPrice[] {
  const results: ScrapedPrice[] = [];
  const now = new Date().toISOString();

  // Thử nhiều selector — trang giacaphe.com dùng nhiều cấu trúc khác nhau
  const selectors = [
    "table tr",
    ".price-table tr",
    ".gia-ca-phe tr",
    ".entry-content table tr",
    "article table tr",
    ".post-content table tr",
    ".wpb_wrapper table tr",
  ];

  for (const selector of selectors) {
    $(selector).each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 2) return;

      const raw0 = $(cells[0]).text().trim();
      const raw1 = $(cells[1]).text().trim();
      const raw2 = cells.length >= 3 ? $(cells[2]).text().trim() : "0";

      const province = normalizeProvince(raw0);
      const price    = parsePrice(raw1);

      if (!VALID_PROVINCES.has(province)) return;
      if (price < 10_000 || price > 300_000) return;

      results.push({
        province,
        price,
        change_value: parseChange(raw2),
        source_url:   TARGET_URL,
        scraped_at:   now,
      });
    });

    if (results.length > 0) break;
  }

  // Loại bỏ duplicate cùng tỉnh
  return Array.from(new Map(results.map((p) => [p.province, p])).values());
}

// ─────────────────────────────────────────────
// MAIN SCRAPER
// ─────────────────────────────────────────────

export async function scrapeCoffeePrices(): Promise<ScrapeResult> {
  // ── Lấy ScraperAPI key ───────────────────────
  const apiKey = process.env.SCRAPER_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      data:    [],
      error:   "Thiếu SCRAPER_API_KEY trong environment variables",
    };
  }

  // ── Build URL ScraperAPI ─────────────────────
  const scraperUrl =
    `http://api.scraperapi.com` +
    `?api_key=${apiKey}` +
    `&url=${encodeURIComponent(TARGET_URL)}` +
    `&render=false`;   // false = HTML tĩnh, nhanh hơn & tiết kiệm credit

  // ── Fetch qua ScraperAPI ─────────────────────
  let html: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(scraperUrl, {
      signal: controller.signal,
      cache:  "no-store",
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(
        `ScraperAPI trả về HTTP ${response.status}: ${response.statusText}`
      );
    }

    html = await response.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định";
    return { success: false, data: [], error: `Fetch thất bại: ${message}` };
  }

  // ── Parse HTML ───────────────────────────────
  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch {
    return {
      success:       false,
      data:          [],
      error:         "Không thể parse HTML",
      html_snapshot: html.substring(0, 500),
    };
  }

  // ── Trích xuất dữ liệu ───────────────────────
  const prices = parseHtml($);

  if (prices.length === 0) {
    return {
      success:       false,
      data:          [],
      error:         "Không tìm thấy bảng giá — trang nguồn có thể đã thay đổi cấu trúc HTML",
      html_snapshot: html.substring(0, 2000),
    };
  }

  return { success: true, data: prices, error: null };
}
