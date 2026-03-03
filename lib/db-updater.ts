import { createClient } from "@supabase/supabase-js";
import type { ScrapedPrice } from "./scraper";

export interface UpsertResult {
  success:  boolean;
  upserted: number;
  skipped:  number;
  errors:   string[];
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Thiếu Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function upsertCoffeePrices(prices: ScrapedPrice[]): Promise<UpsertResult> {
  const result: UpsertResult = { success: true, upserted: 0, skipped: 0, errors: [] };
  if (prices.length === 0) {
    result.success = false;
    result.errors.push("Không có dữ liệu để upsert");
    return result;
  }
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.from("prices").select("province, price").eq("type", "coffee");
  const existingMap = new Map((existing ?? []).map((r: { province: string; price: number }) => [r.province, r.price]));
  const rowsToUpsert = prices.map((p) => ({
    province:     p.province,
    price:        p.price,
    change_value: p.change_value,
    type:         "coffee",
    updated_at:   p.scraped_at,
  }));
  const { error: upsertError, count } = await supabase
    .from("prices")
    .upsert(rowsToUpsert, { onConflict: "province,type", ignoreDuplicates: false })
    .select();
  if (upsertError) {
    result.success = false;
    result.errors.push(`Upsert thất bại: ${upsertError.message}`);
    return result;
  }
  result.upserted = count ?? prices.length;
  const historyRows = prices
    .filter((p) => { const prev = existingMap.get(p.province); return prev === undefined || prev !== p.price; })
    .map((p) => ({ province: p.province, price: p.price, change_value: p.change_value, type: "coffee", recorded_at: p.scraped_at }));
  if (historyRows.length > 0) {
    const { error: historyError } = await supabase.from("price_history").insert(historyRows);
    if (historyError) result.errors.push(`History warning: ${historyError.message}`);
  }
  result.skipped = prices.length - historyRows.length;
  return result;
}
