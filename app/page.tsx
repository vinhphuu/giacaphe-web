import { buildHomeMetadata, PriceSchemaScript } from "@/lib/seo";
import MarketInsight from "@/components/MarketInsight";
import WorldPrices from "@/components/WorldPrices";
import LatestNews from "@/components/LatestNews";
/**
 * app/page.tsx
 *
 * Dashboard chính — Server Component.
 * Fetch dữ liệu server-side, không cần loading spinner cho lần đầu.
 *
 * Cấu trúc:
 *   Header → Summary Cards → PriceChart → PriceTable → Footer
 */

import { Suspense } from "react";
import { Coffee, RefreshCw, Clock, Globe } from "lucide-react";
import {
  fetchCoffeePrices,
  fetchPriceSummary,
  fetchPriceHistory,
} from "@/lib/actions";
import {
  SummaryCard,
  SummaryCardSkeleton,
} from "@/components/SummaryCard";
import {
  PriceTable,
  PriceTableSkeleton,
} from "@/components/PriceTable";
import { PriceChart, PriceChartSkeleton } from "@/components/PriceChart";
import type { PriceCardData } from "@/types";

// ─────────────────────────────────────────────
// METADATA động (giá thực tế trong title)
// ─────────────────────────────────────────────

export async function generateMetadata() {
  const { data } = await fetchPriceSummary();
  const price = data?.avg?.toLocaleString("vi-VN") ?? "—";
  return {
    title: `Giá cà phê hôm nay: ${price}đ/kg | Tây Nguyên`,
  };
}

// ─────────────────────────────────────────────
// PAGE COMPONENT
// ─────────────────────────────────────────────

export default async function HomePage() {
  // Chạy song song để giảm thời gian chờ
  const [summaryResult, pricesResult, historyResult] = await Promise.all([
    fetchPriceSummary(),
    fetchCoffeePrices(),
    fetchPriceHistory("Đắk Lắk"),
  ]);

  const summary     = summaryResult.data;
  const allPrices   = pricesResult.data ?? [];
  const chartData   = historyResult.data ?? [];

  // Phân nhóm tỉnh Tây Nguyên vs tỉnh khác
  const taynguyen   = allPrices.filter((p) =>
    ["Đắk Lắk", "Gia Lai", "Lâm Đồng", "Đắk Nông", "Kon Tum"].includes(p.region)
  );
  const others      = allPrices.filter((p) => !taynguyen.includes(p));

  const now         = new Date().toLocaleTimeString("vi-VN", {
    hour:   "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm">
              <Coffee className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none">
                Giá Cà Phê
              </div>
              <div className="text-[10px] text-slate-400 leading-none mt-0.5">
                Cập nhật hàng ngày
              </div>
            </div>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
            <Clock className="w-3 h-3" />
            {now}
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* ── PAGE TITLE ── */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Giá cà phê hôm nay
          </h1>
      <MarketInsight />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            Tổng hợp từ các đầu mối thu mua Tây Nguyên
            {summary && (
              <>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span>Cập nhật: {summary.updatedAt}</span>
              </>
            )}
          </p>
        </div>

        {/* ── SUMMARY CARDS ── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Tổng quan thị trường
          </h2>
          {summary ? (
            <div className="grid grid-cols-3 gap-3">
              <SummaryCard
                label="Cao nhất"
                value={summary.max}
                variant="high"
              />
              <SummaryCard
                label="Trung bình"
                value={summary.avg}
                variant="avg"
              />
              <SummaryCard
                label="Thấp nhất"
                value={summary.min}
                variant="low"
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => <SummaryCardSkeleton key={i} />)}
            </div>
          )}
        </section>

        {/* ── PRICE CHART ── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Biểu đồ xu hướng 7 ngày
          </h2>
          <PriceChart
            data={chartData}
            region="Đắk Lắk"
          />
        </section>

        {/* ── PRICE TABLES ── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Bảng giá chi tiết
          </h2>
          <div className="space-y-4">
            {allPrices.length > 0 ? (
              <>
                <PriceTable
                  title="Tây Nguyên"
                  rows={taynguyen}
                  emoji="🏔️"
                />
                {others.length > 0 && (
                  <PriceTable
                    title="Khu vực khác"
                    rows={others}
                    emoji="🗺️"
                  />
                )}
              </>
            ) : (
              <PriceTableSkeleton rows={5} />
            )}
          </div>
        </section>

        {/* ── ERROR STATE ── */}
        {pricesResult.error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
            <RefreshCw className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Không thể tải dữ liệu</p>
              <p className="text-xs mt-0.5 opacity-80">{pricesResult.error}</p>
            </div>
          </div>
        )}

                    <WorldPrices />
      <LatestNews />
          <PriceSchemaScript />
    </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 mt-12 py-6">
        <div className="max-w-2xl mx-auto px-4 text-center text-xs text-slate-400 space-y-1">
          <p className="flex items-center justify-center gap-1.5">
            <Coffee className="w-3 h-3 text-amber-500" />
            <span className="font-semibold text-slate-600 dark:text-slate-300">GiaCaPheHomNay.vn</span>
          </p>
          <p>Dữ liệu mang tính tham khảo. Cập nhật mỗi buổi sáng.</p>
        </div>
      </footer>

    </div>
  );
}
