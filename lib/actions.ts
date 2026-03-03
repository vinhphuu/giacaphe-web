/**
 * lib/actions.ts
 *
 * Server Actions — chạy hoàn toàn trên server, không expose sang client.
 * Dùng `"use server"` để Next.js 15 nhận diện.
 *
 * Lợi ích so với fetch trong component:
 *  - Dữ liệu không bao giờ lộ sang browser
 *  - Có thể cache và revalidate tập trung
 *  - Gọi được từ cả Server Component lẫn Client Component
 */

"use server";

import { supabase } from "@/lib/supabase";
import type {
  PriceRow,
  PriceHistoryRow,
  PriceCardData,
  ChartDataPoint,
  FetchResult,
} from "@/types";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** ISO timestamp → "08:30, 03/03" */
function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    const time = d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const date = d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
    return `${time}, ${date}`;
  } catch {
    return iso;
  }
}

/** DB row → component prop */
function mapToPriceCard(row: PriceRow): PriceCardData {
  return {
    region:      row.region,
    price:       row.price,
    changeValue: row.change_value,
    updatedAt:   formatTimestamp(row.updated_at),
    weekHigh:    row.week_high  ?? row.price + 1500,
    weekLow:     row.week_low   ?? row.price - 1500,
  };
}

/** ISO timestamp → "T2", "T3", ... */
function formatDayLabel(iso: string): string {
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return days[new Date(iso).getDay()];
}

// ─────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────

/**
 * Lấy tất cả giá cà phê hiện tại.
 * Dùng trong Server Component: gọi trực tiếp như async function.
 * Dùng trong Client Component: gọi qua useEffect hoặc form action.
 */
export async function fetchCoffeePrices(): Promise<FetchResult<PriceCardData[]>> {
  try {
    const { data, error } = await supabase
      .from("prices")
      .select("id, region, price, change_value, updated_at, type, week_high, week_low")
      .eq("type", "coffee")
      .order("region", { ascending: true });

    if (error) throw new Error(error.message);

    return {
      data:  (data as PriceRow[]).map(mapToPriceCard),
      error: null,
    };
  } catch (err) {
    return {
      data:  null,
      error: err instanceof Error ? err.message : "Lỗi không xác định",
    };
  }
}

/**
 * Lấy lịch sử giá 7 ngày của một tỉnh để vẽ biểu đồ.
 */
export async function fetchPriceHistory(
  region: string,
  days = 7
): Promise<FetchResult<ChartDataPoint[]>> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from("price_history")
      .select("price, recorded_at")
      .eq("region", region)
      .eq("type", "coffee")
      .gte("recorded_at", since.toISOString())
      .order("recorded_at", { ascending: true });

    if (error) throw new Error(error.message);

    // Nếu chưa có bảng price_history → dùng mock data
    const rows = data as Pick<PriceHistoryRow, "price" | "recorded_at">[];
    const points: ChartDataPoint[] = rows.map((r) => ({
      date:  formatDayLabel(r.recorded_at),
      price: r.price,
    }));

    return { data: points, error: null };
  } catch (err) {
    // Trả về mock data để không break UI khi bảng chưa tồn tại
    const mockData: ChartDataPoint[] = [
      { date: "T4", price: 94500 },
      { date: "T5", price: 95000 },
      { date: "T6", price: 95800 },
      { date: "T7", price: 95500 },
      { date: "CN", price: 96000 },
      { date: "T2", price: 96200 },
      { date: "T3", price: 96000 },
    ];
    return { data: mockData, error: null };
  }
}

/**
 * Lấy giá tổng hợp để hiển thị summary cards (giá cao nhất, thấp nhất, trung bình).
 */
export async function fetchPriceSummary(): Promise<
  FetchResult<{ max: number; min: number; avg: number; updatedAt: string }>
> {
  try {
    const { data, error } = await supabase
      .from("prices")
      .select("price, updated_at")
      .eq("type", "coffee");

    if (error) throw new Error(error.message);

    const rows = data as { price: number; updated_at: string }[];
    if (!rows || rows.length === 0) throw new Error("Không có dữ liệu");

    const prices  = rows.map((r) => r.price);
    const max     = Math.max(...prices);
    const min     = Math.min(...prices);
    const avg     = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const latest  = rows.sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0].updated_at;

    return {
      data:  { max, min, avg, updatedAt: formatTimestamp(latest) },
      error: null,
    };
  } catch (err) {
    return {
      data:  null,
      error: err instanceof Error ? err.message : "Lỗi không xác định",
    };
  }
}
