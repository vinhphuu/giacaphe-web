export const maxDuration = 60;
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { scrapeWorldPrices, upsertWorldPrices } from "@/lib/world-scraper";
export async function GET() {
  const result = await scrapeWorldPrices();
  if (!result.success) return NextResponse.json({ scrape_error: result.error });
  const london = result.data.filter(p => p.exchange === "London");
  const ny = result.data.filter(p => p.exchange === "New York");
  const upsertResult = await upsertWorldPrices(result.data);
  // Lấy raw HTML để debug
  const apiKey = process.env.SCRAPER_API_KEY;
  let htmlSnippet = "";
  if (apiKey) {
    const r = await fetch(`http://api.scraperapi.com?api_key=${apiKey}&url=https%3A%2F%2Fgiacaphe.com%2Fgia-ca-phe-truc-tuyen%2F&render=false`, { cache: "no-store" });
    const html = await r.text();
    // Tìm đoạn có robusta
    const idx = html.toLowerCase().indexOf("robusta");
    htmlSnippet = idx >= 0 ? html.slice(Math.max(0, idx-200), idx+500) : "robusta not found in HTML";
  }

  return NextResponse.json({
    total: result.data.length,
    london_count: london.length,
    ny_count: ny.length,
    london_data: london,
    upsert: upsertResult,
    html_around_robusta: htmlSnippet
  });
}
