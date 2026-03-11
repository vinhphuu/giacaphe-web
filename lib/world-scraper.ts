/**
 * lib/world-scraper.ts
 *
 * Crawl giá cà phê thế giới từ giacaphe.com/gia-ca-phe-truc-tuyen/
 *   - Sàn London  (Robusta): USD/Tấn
 *   - Sàn New York (Arabica): Cent/lb
 *
 * Dùng ScraperAPI để bypass bot protection (cùng key với scraper nội địa)
 * Dùng kỹ thuật CSS content map (giống scraper nội địa đã hoạt động)
 */

import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface WorldPrice {
  exchange:   "London" | "New York";
  contract:   string;   // Mar-25, May-25 ...
  price:      number;
  change_pt:  number;
  change_pct: number;
  high:       number;
  low:        number;
  volume:     string;
  unit:       string;
}

export interface WorldScrapeResult {
  success:  boolean;
  data:     WorldPrice[];
  error:    string | null;
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const TARGET_URL    = "https://giacaphe.com/gia-ca-phe-truc-tuyen/";
const FETCH_TIMEOUT = 35_000;

// ─────────────────────────────────────────────
// CSS CONTENT MAP (kỹ thuật đã dùng cho nội địa)
// ─────────────────────────────────────────────

function buildCssContentMap(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  for (const block of styleBlocks) {
    const pattern = /\.([A-Za-z0-9_-]+)::after\s*\{[^}]*content\s*:\s*['"]([^'"]*)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(block[1])) !== null) {
      if (match[1] && match[2].trim()) map.set(match[1], match[2].trim());
    }
  }
  return map;
}

function getValueFromClasses(classAttr: string, cssMap: Map<string, string>): string {
  for (const cls of (classAttr ?? "").split(/\s+/)) {
    const val = cssMap.get(cls);
    if (val && val !== "") return val;
  }
  return "";
}

// ─────────────────────────────────────────────
// PARSE HELPERS
// ─────────────────────────────────────────────

function parseNum(raw: string): number {
  if (!raw || raw.trim() === "" || raw === "—" || raw === "-") return 0;
  // Xử lý số âm: "-120" hoặc "(-120)"
  const isNeg = raw.includes("-") && !raw.startsWith("+");
  const cleaned = raw.replace(/[^\d.]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return isNeg ? -num : num;
}

function parseChange(raw: string): { pt: number; pct: number } {
  if (!raw || raw.trim() === "" || raw === "—") return { pt: 0, pct: 0 };

  // Format: "+120 (+0.50%)" hoặc "-80 (-0.32%)"
  const ptMatch  = raw.match(/([+-]?\d+(?:[.,]\d+)?)\s*(?:\(|$)/);
  const pctMatch = raw.match(/\(([+-]?\d+(?:[.,]\d+)?)%?\)/);

  const pt  = ptMatch  ? parseNum(ptMatch[1])  : 0;
  const pct = pctMatch ? parseNum(pctMatch[1]) : 0;
  const neg = raw.trim().startsWith("-");

  return {
    pt:  neg && pt  > 0 ? -pt  : pt,
    pct: neg && pct > 0 ? -pct : pct,
  };
}

// ─────────────────────────────────────────────
// HTML PARSER
// ─────────────────────────────────────────────

function parseWorldPrices(html: string): WorldPrice[] {
  const $ = cheerio.load(html);
  const cssMap = buildCssContentMap(html);
  const results: WorldPrice[] = [];

  // Tìm tất cả bảng trên trang
  $("table").each((tableIdx, table) => {
    const tableHtml = $(table).html() ?? "";
    const headerText = $(table).find("thead th, th").first().text().toLowerCase();
    const captionText = $(table).find("caption").text().toLowerCase();
    const nearbyText = $(table).closest("div, section").find("h2, h3, h4, p").first().text().toLowerCase();
    const contextText = (headerText + captionText + nearbyText).toLowerCase();

    // Phân loại sàn dựa vào context text gần bảng
    let exchange: "London" | "New York" | null = null;
    let unit = "";

    if (contextText.includes("london") || contextText.includes("robusta") || contextText.includes("liffe")) {
      exchange = "London";
      unit = "USD/Tấn";
    } else if (contextText.includes("new york") || contextText.includes("arabica") || contextText.includes("ice") || contextText.includes("nybot")) {
      exchange = "New York";
      unit = "Cent/lb";
    }

    // Nếu không nhận ra từ context, thử dựa vào ID/class của table/wrapper
    if (!exchange) {
      // Kiểm tra tất cả ancestor IDs (giacaphe.com dùng id="robusta-london" ở grandparent)
      let ancestorIds = "";
      let el = $(table).parent();
      for (let depth = 0; depth < 5; depth++) {
        const id = el.attr("id") ?? "";
        const cls = el.attr("class") ?? "";
        ancestorIds += " " + id + " " + cls;
        if (!el.parent().length) break;
        el = el.parent();
      }
      if (/london|robusta|liffe/i.test(ancestorIds)) { exchange = "London"; unit = "USD/Tấn"; }
      else if (/york|arabica|ice|nybot/i.test(ancestorIds)) { exchange = "New York"; unit = "Cent/lb"; }
    }

    if (!exchange) return; // Bỏ qua bảng không xác định được

    // Đọc từng row trong tbody
    $(table).find("tbody tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 3) return;

      // Helper lấy text từ cell — ưu tiên CSS map, fallback về text thuần
      const getCellText = (idx: number): string => {
        const cell = $(cells[idx]);
        const spanClass = cell.find("span").attr("class") ?? "";
        const cssVal = getValueFromClasses(spanClass, cssMap);
        return cssVal || cell.text().trim();
      };

      // Cột 0: Kỳ hạn (contract)
      const contract = getCellText(0);
      if (!contract || contract.length < 3) return;

      // Cột 1: Giá khớp
      const priceRaw = getCellText(1);
      const price    = parseNum(priceRaw);
      if (price <= 0) return;

      // Cột 2: Thay đổi (có thể là "điểm" hoặc "điểm (pct)")
      const changeRaw = getCellText(2);
      const { pt: change_pt, pct: change_pct } = parseChange(changeRaw);

      // Cột 3,4: Cao/Thấp (optional)
      const high = cells.length > 3 ? parseNum(getCellText(3)) : 0;
      const low  = cells.length > 4 ? parseNum(getCellText(4)) : 0;

      // Cột 5: Volume (optional)
      const volume = cells.length > 5 ? getCellText(5) : "";

      results.push({ exchange, contract, price, change_pt, change_pct, high, low, volume, unit });
    });
  });

  return results;
}

// ─────────────────────────────────────────────
// MAIN SCRAPER
// ─────────────────────────────────────────────

export async function scrapeWorldPrices(): Promise<WorldScrapeResult> {
  const apiKey = process.env.SCRAPER_API_KEY;
  if (!apiKey) return { success: false, data: [], error: "Thiếu SCRAPER_API_KEY" };

  const scraperUrl =
    `http://api.scraperapi.com` +
    `?api_key=${apiKey}` +
    `&url=${encodeURIComponent(TARGET_URL)}` +
    `&render=false`;

  let html: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const response = await fetch(scraperUrl, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timer);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    html = await response.text();
  } catch (err) {
    return {
      success: false, data: [],
      error: `Fetch lỗi: ${err instanceof Error ? err.message : "Unknown"}`,
    };
  }

  const data = parseWorldPrices(html);

  if (data.length === 0) {
    // Fallback: thử parse không dùng CSS map (text thô)
    return {
      success: false, data: [],
      error:   "Không parse được giá thế giới — cấu trúc HTML có thể đã thay đổi",
    };
  }

  return { success: true, data, error: null };
}

// ─────────────────────────────────────────────
// UPSERT VÀO SUPABASE
// ─────────────────────────────────────────────

export async function upsertWorldPrices(prices: WorldPrice[]): Promise<{
  success: boolean; upserted: number; error: string | null;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { success: false, upserted: 0, error: "Thiếu Supabase env" };

  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // Tính updated_at theo múi giờ VN
  const updatedAt = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" })
    .replace(" ", "T") + "+07:00";

  const rows = prices.map((p) => ({
    exchange:   p.exchange,
    contract:   p.contract,
    price:      p.price,
    change_pt:  p.change_pt,
    change_pct: p.change_pct,
    high:       p.high || null,
    low:        p.low  || null,
    volume:     p.volume || null,
    unit:       p.unit,
    updated_at: updatedAt,
  }));

  const { error, count } = await sb
    .from("world_coffee_prices")
    .upsert(rows, { onConflict: "exchange,contract" })
    .select("id");

  if (error) return { success: false, upserted: 0, error: error.message };
  return { success: true, upserted: count ?? rows.length, error: null };
}
