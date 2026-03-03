/**
 * components/PriceTable.tsx
 *
 * Bảng giá chi tiết phân nhóm theo khu vực.
 * Server Component — không cần "use client"
 */

import { MapPin, TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";
import type { PriceCardData } from "@/types";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function formatVND(n: number) {
  return n.toLocaleString("vi-VN");
}

function ChangeChip({ value }: { value: number }) {
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
        <TrendingUp className="w-3 h-3" />+{formatVND(value)}đ
      </span>
    );
  if (value < 0)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300">
        <TrendingDown className="w-3 h-3" />{formatVND(value)}đ
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      <Minus className="w-3 h-3" />—
    </span>
  );
}

// ─────────────────────────────────────────────
// PRICE ROW — một dòng trong bảng
// ─────────────────────────────────────────────

function PriceRow({
  row,
  isLast,
}: {
  row: PriceCardData;
  isLast: boolean;
}) {
  const priceColor =
    row.changeValue > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : row.changeValue < 0
      ? "text-red-600 dark:text-red-400"
      : "text-slate-800 dark:text-slate-200";

  return (
    <div
      className={`
        flex items-center justify-between gap-4 px-4 py-3
        ${!isLast ? "border-b border-slate-100 dark:border-slate-700/60" : ""}
      `}
    >
      {/* Tỉnh */}
      <div className="flex items-center gap-2 min-w-0">
        <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
          {row.province}
        </span>
      </div>

      {/* Giá + biến động */}
      <div className="flex items-center gap-3 shrink-0">
        <ChangeChip value={row.changeValue} />
        <div className="text-right">
          <p className={`text-sm font-bold tabular-nums ${priceColor}`}>
            {formatVND(row.price)}đ
          </p>
          <p className="text-[10px] text-slate-400 flex items-center gap-0.5 justify-end">
            <Clock className="w-2.5 h-2.5" />
            {row.updatedAt}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PRICE TABLE — bảng chính có header
// ─────────────────────────────────────────────

interface PriceTableProps {
  title:  string;
  rows:   PriceCardData[];
  emoji?: string;
}

export function PriceTable({ title, rows, emoji = "☕" }: PriceTableProps) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
        <span className="text-base">{emoji}</span>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {title}
        </h3>
        <span className="ml-auto text-xs text-slate-400 bg-slate-200 dark:bg-slate-700 dark:text-slate-400 px-2 py-0.5 rounded-full">
          {rows.length} tỉnh
        </span>
      </div>

      {/* Rows */}
      <div>
        {rows.map((row, i) => (
          <PriceRow key={row.province} row={row} isLast={i === rows.length - 1} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────

export function PriceTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm animate-pulse">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`flex items-center justify-between px-4 py-3 gap-4 ${
            i < rows - 1 ? "border-b border-slate-100 dark:border-slate-700/60" : ""
          }`}
        >
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="flex items-center gap-3">
            <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
            <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
