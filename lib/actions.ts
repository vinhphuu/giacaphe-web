/**
 * lib/actions.ts — Server Actions
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

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const date = d.toLocaleDateString("vi-VN",  { day: "2-digit", month: "2-digit" });
    return `${time}, ${date}`;
  } catch {
    return iso;
  }
}

function formatDayLabel(iso: string): string {
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return days[new Date(iso).getDay()];
}

/** DB row → component prop — xử lý null an toàn */
function mapToPriceCard(row: PriceRow): PriceCardData {
  return {
    region:      row.region,
    price:       row.price,
    // Fallback về 0 nếu cột chưa có hoặc null
    changeValue: row.change_value ?? 0,
    updatedAt:   formatTimestamp(row.updated_at),
    weekHigh:    row.week_high  ?? row.price + 1500,
    weekLow:     row.week_low   ?? row.price - 1500,
  };
}

// ─────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────

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

    const rows = data as Pick<PriceHistoryRow, "price" | "recorded_at">[];
    const points: ChartDataPoint[] = rows.map((r) => ({
      date:  formatDayLabel(r.recorded_at),
      price: r.price,
    }));

    return { data: points, error: null };
  } catch {
    // Trả mock data nếu bảng price_history chưa có
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
    const latest  = [...rows].sort((a, b) =>
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