/**
 * lib/db-updater.ts
 *
 * Nhận dữ liệu từ scraper → chuẩn hoá → upsert vào Supabase.
 *
 * Dùng UPSERT (INSERT ... ON CONFLICT DO UPDATE) thay vì UPDATE đơn thuần:
 * - Nếu tỉnh đã có → cập nhật giá mới
 * - Nếu tỉnh chưa có → tự động thêm mới
 */

import { createClient } from "@supabase/supabase-js";
import type { ScrapedPrice } from "./scraper";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface UpsertResult {
  success:  boolean;
  upserted: number;   // số dòng đã cập nhật
  skipped:  number;   // số dòng bỏ qua (giá không đổi)
  errors:   string[];
}

interface PriceHistoryRow {
  region:      string;
  price:       number;
  change_value: number;
  type:        string;
  recorded_at: string;
}

// ─────────────────────────────────────────────
// SUPABASE CLIENT (Service Role — quyền ghi)
// Dùng service_role key KHÔNG phải anon key
// KHÔNG đặt NEXT_PUBLIC_ vì chỉ chạy server-side
// ─────────────────────────────────────────────

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong environment variables"
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession:  false,
      autoRefreshToken: false,
    },
  });
}

// ─────────────────────────────────────────────
// MAIN UPSERT FUNCTION
// ─────────────────────────────────────────────

export async function upsertCoffeePrices(
  prices: ScrapedPrice[]
): Promise<UpsertResult> {
  const result: UpsertResult = {
    success:  true,
    upserted: 0,
    skipped:  0,
    errors:   [],
  };

  if (prices.length === 0) {
    result.success = false;
    result.errors.push("Không có dữ liệu để upsert");
    return result;
  }

  const supabase = getSupabaseAdmin();

  // ── 1. Lấy giá hiện tại để so sánh ─────────
  const { data: existing } = await supabase
    .from("prices")
    .select("region, price")
    .eq("type", "coffee");

  const existingMap = new Map(
    (existing ?? []).map((r: { region: string; price: number }) => [r.region, r.price])
  );

  // ── 2. Chuẩn bị rows để upsert ──────────────
  const rowsToUpsert = prices.map((p) => ({
    region:       p.region,
    price:        p.price,
    change_value: p.change_value,
    type:         "coffee",
    updated_at:   p.scraped_at,
    // week_high / week_low cập nhật tự động bằng trigger (xem SQL bên dưới)
  }));

  // ── 3. Upsert vào bảng prices ────────────────
  // onConflict: nếu (region, type) đã có → update, chưa có → insert
  const { error: upsertError, count } = await supabase
    .from("prices")
    .upsert(rowsToUpsert, {
      onConflict:        "region,type",
      ignoreDuplicates:  false,  // false = luôn update dù giá không đổi
    })
    .select();

  if (upsertError) {
    result.success = false;
    result.errors.push(`Upsert prices thất bại: ${upsertError.message}`);
    return result;
  }

  result.upserted = count ?? prices.length;

  // ── 4. Ghi vào price_history (cho biểu đồ) ──
  // Chỉ ghi khi giá thực sự thay đổi (tiết kiệm storage)
  const historyRows: PriceHistoryRow[] = prices
    .filter((p) => {
      const prev = existingMap.get(p.region);
      return prev === undefined || prev !== p.price;
    })
    .map((p) => ({
      region:       p.region,
      price:        p.price,
      change_value: p.change_value,
      type:         "coffee",
      recorded_at:  p.scraped_at,
    }));

  if (historyRows.length > 0) {
    const { error: historyError } = await supabase
      .from("price_history")
      .insert(historyRows);

    if (historyError) {
      // Không fail toàn bộ job nếu history lỗi — chỉ log warning
      result.errors.push(`History insert warning: ${historyError.message}`);
    }
  }

  result.skipped = prices.length - historyRows.length;
  return result;
}
