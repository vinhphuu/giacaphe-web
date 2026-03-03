import * as cheerio from "cheerio";

export interface ScrapedPrice {
  province:     string;
  price:        number;
  change_value: number;
  source_url:   string;
  scraped_at:   string;
}

export interface ScrapeResult {
  success:        boolean;
  data:           ScrapedPrice[];
  error:          string | null;
  html_snapshot?: string;
}

const TARGET_URL    = "https://giacaphe.com/gia-ca-phe-noi-dia/";
const FETCH_TIMEOUT = 30_000;

const COFFEE_PROVINCES = new Set([
  "Đắk Lắk", "Gia Lai", "Lâm Đồng", "Đắk Nông", "Kon Tum", "Bình Phước", "Đồng Nai",
]);

function parsePrice(raw: string): number {
  const num = parseInt(raw.replace(/[^\d]/g, ""), 10);
  return isNaN(num) ? 0 : num;
}

function parseChange(raw: string): number {
  const t = raw.trim();
  if (!t || ["—", "-", "0", ""].includes(t)) return 0;
  const isNeg = t.startsWith("-");
  const num = parseInt(t.replace(/[^\d]/g, ""), 10);
  if (isNaN(num) || num === 0) return 0;
  return isNeg ? -num : num;
}

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
  for (const cls of classAttr.split(/\s+/)) {
    const val = cssMap.get(cls);
    if (val) return val;
  }
  return "";
}

function parseHtml(html: string): ScrapedPrice[] {
  const $ = cheerio.load(html);
  const cssMap = buildCssContentMap(html);
  const results: ScrapedPrice[] = [];
  const now = new Date().toISOString();

  $("table tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 2) return;

    const province = $(cells[0]).find("a").text().trim() || $(cells[0]).text().trim();
    if (!COFFEE_PROVINCES.has(province)) return;

    const priceRaw  = getValueFromClasses($(cells[1]).find("span").attr("class") ?? "", cssMap);
    const price     = parsePrice(priceRaw);
    if (price < 10_000 || price > 300_000) return;

    const changeRaw = getValueFromClasses($(cells[2]).find("span").attr("class") ?? "", cssMap);

    results.push({ province, price, change_value: parseChange(changeRaw), source_url: TARGET_URL, scraped_at: now });
  });

  return Array.from(new Map(results.map((p) => [p.province, p])).values());
}

export async function scrapeCoffeePrices(): Promise<ScrapeResult> {
  const apiKey = process.env.SCRAPER_API_KEY;
  if (!apiKey) return { success: false, data: [], error: "Thiếu SCRAPER_API_KEY" };

  let html: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const response = await fetch(
      `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(TARGET_URL)}&render=false`,
      { signal: controller.signal, cache: "no-store" }
    );
    clearTimeout(timer);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    html = await response.text();
  } catch (err) {
    return { success: false, data: [], error: `Fetch thất bại: ${err instanceof Error ? err.message : "Unknown"}` };
  }

  const prices = parseHtml(html);
  if (prices.length === 0) {
    return { success: false, data: [], error: "Không parse được giá", html_snapshot: html.substring(0, 3000) };
  }
  return { success: true, data: prices, error: null };
}
