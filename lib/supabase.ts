/**
 * lib/supabase.ts
 *
 * Khởi tạo Supabase client cho 2 môi trường:
 *  - Browser  (component "use client") → dùng `createBrowserClient`
 *  - Server   (Server Component / Server Action) → dùng `createServerClient`
 *
 * Cài đặt:
 *   npm install @supabase/supabase-js
 */

import { createClient } from "@supabase/supabase-js";
import type { PriceRow, PriceHistoryRow } from "@/types";

// ─────────────────────────────────────────────
// ENVIRONMENT VARIABLES
// ─────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Thiếu biến môi trường Supabase.\n" +
    "Thêm NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY vào .env.local"
  );
}

// ─────────────────────────────────────────────
// CLIENT SINGLETON
// Dùng được cả ở Server Component lẫn Client Component
// vì chỉ dùng anon key (public)
// ─────────────────────────────────────────────

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Web này chỉ đọc dữ liệu công khai, không cần auth
    persistSession: false,
    autoRefreshToken: false,
  },
});

// ─────────────────────────────────────────────
// DATABASE HELPERS — typed query wrappers
// ─────────────────────────────────────────────

/** Lấy toàn bộ giá hiện tại theo loại (coffee / pepper) */
export async function getPricesByType(type: "coffee" | "pepper") {
  const { data, error } = await supabase
    .from("prices")
    .select("id, region, price, change_value, updated_at, type, week_high, week_low")
    .eq("type", type)
    .order("region", { ascending: true });

  return {
    data: data as PriceRow[] | null,
    error: error?.message ?? null,
  };
}

/** Lấy lịch sử giá 7 ngày để vẽ biểu đồ */
export async function getPriceHistory(
  region: string,
  type: "coffee" | "pepper" = "coffee",
  days = 7
) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("price_history")
    .select("id, region, price, recorded_at, type")
    .eq("region", region)
    .eq("type", type)
    .gte("recorded_at", since.toISOString())
    .order("recorded_at", { ascending: true });

  return {
    data: data as PriceHistoryRow[] | null,
    error: error?.message ?? null,
  };
}
