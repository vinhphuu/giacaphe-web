import { createClient } from "@supabase/supabase-js";

export interface ScrapedPrice {
  province: string; price: number; change_value: number;
  source_url: string; scraped_at: string;
}
export interface UpsertResult {
  success: boolean; upserted: number; skipped: number; errors: string[];
}

const REGION_MAP: Record<string, string> = {
  "Đắk Lắk": "Tây Nguyên", "Gia Lai": "Tây Nguyên", "Lâm Đồng": "Tây Nguyên",
  "Đắk Nông": "Tây Nguyên", "Kon Tum": "Tây Nguyên",
  "Bình Phước": "Đông Nam Bộ", "Đồng Nai": "Đông Nam Bộ",
};

export async function upsertCoffeePrices(scraped: ScrapedPrice[]): Promise<UpsertResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { success: false, upserted: 0, skipped: 0, errors: ["Thiếu Supabase env"] };

  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: existing } = await sb.from("prices").select("province,price").eq("type", "coffee");
  const existingMap = new Map<string, number>(
    (existing ?? []).map((r: { province: string; price: number }) => [r.province, r.price])
  );

  const hasAnyChange = scraped.some(p => existingMap.get(p.province) !== p.price);

  const syncedAt = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" })
    .replace(" ", "T") + "+07:00";

  const rows = scraped.map(p => ({
    province:     p.province,
    region:       REGION_MAP[p.province] ?? "Khác",
    type:         "coffee",
    price:        p.price,
    change_value: p.change_value,
    source_url:   p.source_url,
    ...(hasAnyChange ? { updated_at: syncedAt } : {}),
  }));

  const { error, count } = await sb.from("prices")
    .upsert(rows, { onConflict: "province,type" }).select("province");

  if (error) return { success: false, upserted: 0, skipped: scraped.length, errors: [error.message] };

  // Ghi history — dùng đúng cột "region" thay vì "province"
  const changed = scraped.filter(p => existingMap.get(p.province) !== p.price);
  if (changed.length > 0) {
    await sb.from("price_history").insert(
      changed.map(p => ({
        region:      REGION_MAP[p.province] ?? p.province,
        province:    p.province,
        type:        "coffee",
        price:       p.price,
        recorded_at: syncedAt,
      }))
    );
  }

  return { success: true, upserted: count ?? scraped.length, skipped: scraped.length - changed.length, errors: [] };
}
