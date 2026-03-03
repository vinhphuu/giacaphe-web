/**
 * components/SummaryCard.tsx
 *
 * Hiển thị 3 summary cards: Cao nhất / Thấp nhất / Trung bình
 * Server Component — không cần "use client"
 */

import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface SummaryCardProps {
  label:     string;
  value:     number;
  sublabel?: string;
  variant:   "high" | "low" | "avg";
}

function formatVND(n: number) {
  return n.toLocaleString("vi-VN");
}

const VARIANT_STYLES = {
  high: {
    bg:        "bg-emerald-50 dark:bg-emerald-950/40",
    border:    "border-emerald-200 dark:border-emerald-800",
    iconBg:    "bg-emerald-100 dark:bg-emerald-900",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    valueColor:"text-emerald-700 dark:text-emerald-300",
    Icon:       TrendingUp,
  },
  low: {
    bg:        "bg-red-50 dark:bg-red-950/40",
    border:    "border-red-200 dark:border-red-800",
    iconBg:    "bg-red-100 dark:bg-red-900",
    iconColor: "text-red-600 dark:text-red-400",
    valueColor:"text-red-700 dark:text-red-300",
    Icon:       TrendingDown,
  },
  avg: {
    bg:        "bg-amber-50 dark:bg-amber-950/40",
    border:    "border-amber-200 dark:border-amber-800",
    iconBg:    "bg-amber-100 dark:bg-amber-900",
    iconColor: "text-amber-600 dark:text-amber-400",
    valueColor:"text-amber-700 dark:text-amber-300",
    Icon:       Activity,
  },
} as const;

export function SummaryCard({ label, value, sublabel, variant }: SummaryCardProps) {
  const s    = VARIANT_STYLES[variant];
  const Icon = s.Icon;

  return (
    <div className={`rounded-2xl border p-2.5 sm:p-4 ${s.bg} ${s.border}`}>
      <div className="flex items-start justify-between gap-1.5 sm:gap-3">
        {/* Text — co lại trên mobile, không bị tràn */}
        <div className="min-w-0 flex-1">
          <p className="text-[9px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">
            {label}
          </p>
          <p className={`text-base sm:text-2xl font-bold tabular-nums leading-none ${s.valueColor}`}>
            {formatVND(value)}
          </p>
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
            {sublabel ?? "đ/kg"}
          </p>
        </div>

        {/* Icon — nhỏ trên mobile, to hơn trên sm+ */}
        <div className={`
          shrink-0
          w-7 h-7 rounded-lg
          sm:w-10 sm:h-10 sm:rounded-xl
          flex items-center justify-center
          ${s.iconBg}
        `}>
          <Icon className={`w-3.5 h-3.5 sm:w-5 sm:h-5 ${s.iconColor}`} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SUMMARY CARDS SKELETON (Loading state)
// ─────────────────────────────────────────────

export function SummaryCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-7 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      </div>
    </div>
  );
}
