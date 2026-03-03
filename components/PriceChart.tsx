/**
 * components/PriceChart.tsx
 *
 * Biểu đồ đường 7 ngày — dùng Recharts (tương thích React 19).
 *
 * Cài đặt:
 *   npm install recharts
 *
 * Phải là Client Component vì Recharts dùng browser APIs (ResizeObserver, SVG).
 */

"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import type { ChartDataPoint } from "@/types";

// ─────────────────────────────────────────────
// CUSTOM TOOLTIP
// ─────────────────────────────────────────────

interface TooltipPayload {
  value: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">{label}</p>
      <p className="font-bold text-slate-800 dark:text-slate-100">
        {payload[0].value.toLocaleString("vi-VN")}
        <span className="font-normal text-slate-500 ml-1">đ/kg</span>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN CHART COMPONENT
// ─────────────────────────────────────────────

interface PriceChartProps {
  data:       ChartDataPoint[];
  region:     string;
  isLoading?: boolean;
}

export function PriceChart({ data, region, isLoading = false }: PriceChartProps) {
  const [activeRegion, setActiveRegion] = useState(region);

  if (isLoading) return <PriceChartSkeleton />;
  if (!data || data.length === 0) return null;

  const prices = data.map((d) => d.price);
  const minPrice  = Math.min(...prices);
  const maxPrice  = Math.max(...prices);
  const lastPrice = prices[prices.length - 1];
  const firstPrice = prices[0];
  const totalChange = lastPrice - firstPrice;
  const isUp = totalChange >= 0;

  // Y-axis range với padding
  const yMin = Math.floor((minPrice - 500) / 500) * 500;
  const yMax = Math.ceil((maxPrice + 500) / 500) * 500;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <BarChart2 className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Xu hướng 7 ngày
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {activeRegion}
            </h3>
          </div>

          {/* Change badge */}
          <div
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-bold ${
              isUp
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                : "bg-red-50 text-red-600 dark:bg-red-900/50 dark:text-red-300"
            }`}
          >
            {isUp ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {isUp ? "+" : ""}
            {totalChange.toLocaleString("vi-VN")}đ
          </div>
        </div>

        {/* Current price */}
        <p
          className={`text-3xl font-bold tabular-nums mt-2 ${
            isUp
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {lastPrice.toLocaleString("vi-VN")}
          <span className="text-base font-normal text-slate-400 ml-1">đ/kg</span>
        </p>
      </div>

      {/* Chart */}
      <div className="px-1 pb-4 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-slate-100 dark:text-slate-800"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-slate-400 dark:text-slate-500"
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-slate-400 dark:text-slate-500"
              axisLine={false}
              tickLine={false}
              width={52}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#d97706", strokeWidth: 1, strokeDasharray: "4 4" }} />
            <ReferenceLine
              y={firstPrice}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={isUp ? "#10b981" : "#ef4444"}
              strokeWidth={2.5}
              dot={{ fill: isUp ? "#10b981" : "#ef4444", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Min / Max row */}
      <div className="grid grid-cols-2 gap-px border-t border-slate-100 dark:border-slate-700">
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/40">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Thấp nhất</p>
          <p className="text-sm font-bold text-red-500 tabular-nums">
            {minPrice.toLocaleString("vi-VN")}đ
          </p>
        </div>
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/40">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Cao nhất</p>
          <p className="text-sm font-bold text-emerald-600 tabular-nums">
            {maxPrice.toLocaleString("vi-VN")}đ
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────

export function PriceChartSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 animate-pulse">
      <div className="space-y-2 mb-4">
        <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-7 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-9 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
      <div className="h-52 bg-slate-100 dark:bg-slate-800 rounded-xl" />
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg" />
        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg" />
      </div>
    </div>
  );
}
