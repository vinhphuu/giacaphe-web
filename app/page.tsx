"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Clock,
  Globe,
  MapPin,
  BarChart2,
  Coffee,
  Flame,
  ArrowUpRight,
  AlertCircle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// 1. SUPABASE CLIENT
// Tạo file .env.local ở thư mục gốc và thêm 2 dòng:
//   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─────────────────────────────────────────────────────────────────────────────
// TYPESCRIPT INTERFACES
// Phản ánh đúng schema của 2 bảng trong Supabase
// ─────────────────────────────────────────────────────────────────────────────

/** Schema bảng `prices` — giá nội địa theo tỉnh */
interface PriceRow {
  province:   string;
  price:      number;
  change:     number;
  updated_at: string;          // ISO 8601 timestamp
  type:       "coffee" | "pepper";
  // Các cột tuỳ chọn — thêm vào DB khi cần thiết
  region?:    string;
  areas?:     string;
  week_high?: number;
  week_low?:  number;
}

/** Schema bảng `world_market` — giá sàn quốc tế */
interface WorldMarketRow {
  id:         string;          // 'robusta' | 'arabica'
  name:       string;          // 'Robusta' | 'Arabica'
  exchange:   string;          // 'ICE London' | 'ICE New York'
  ticker:     string;          // 'RC1!' | 'KC1!'
  price:      number;
  change:     number;
  change_pct: number;
  unit:       string;          // 'USD/tấn' | '¢/lb'
  session:    string;          // '15:00 – 23:30'
  high:       number;
  low:        number;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT PROP TYPES
// Tách biệt hoàn toàn với DB rows — các UI component chỉ biết về types này
// ─────────────────────────────────────────────────────────────────────────────

type WorldPrice = {
  id:        string;
  name:      string;
  exchange:  string;
  ticker:    string;
  price:     number;
  change:    number;
  changePct: number;
  unit:      string;
  session:   string;
  high:      number;
  low:       number;
  color:     string;
  icon:      typeof Coffee;
};

type LocalCoffeePrice = {
  province:  string;
  region:    string;
  price:     number;
  change:    number;
  updatedAt: string;
  areas:     string;
  weekHigh:  number;
  weekLow:   number;
};

type PepperPrice = {
  province:  string;
  price:     number;
  change:    number;
  updatedAt: string;
  weekHigh:  number;
  weekLow:   number;
};

// ─────────────────────────────────────────────────────────────────────────────
// DATA MAPPERS  (DB row → component prop)
// Giữ toàn bộ logic chuyển đổi ở đây, components không biết gì về DB
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Metadata tĩnh cho từng tỉnh.
 * Được dùng như fallback khi DB chưa có cột `region` và `areas`.
 * Khi DB có dữ liệu đầy đủ, mapper sẽ ưu tiên giá trị từ DB.
 */
const PROVINCE_META: Record<string, { region: string; areas: string }> = {
  "Đắk Lắk":       { region: "Tây Nguyên",   areas: "Buôn Ma Thuột, Cư M'gar, Ea H'leo, Krông Năng" },
  "Gia Lai":        { region: "Tây Nguyên",   areas: "Đăk Đoa, Ia Grai, Chư Prông, Chư Păh" },
  "Lâm Đồng":      { region: "Tây Nguyên",   areas: "Bảo Lộc, Di Linh, Lâm Hà, Đức Trọng" },
  "Đắk Nông":      { region: "Tây Nguyên",   areas: "Đắk Mil, Đắk Song, Krông Nô" },
  "Kon Tum":        { region: "Tây Nguyên",   areas: "Đăk Hà, Ngọc Hồi, Sa Thầy" },
  "Bình Phước":     { region: "Đông Nam Bộ",  areas: "Bù Đăng, Lộc Ninh, Đồng Phú" },
  "BR – Vũng Tàu": { region: "Đông Nam Bộ",  areas: "Xuyên Mộc, Châu Đức, Cẩm Mỹ" },
};

/** Chuyển ISO timestamp → "10:00, 02/03" */
function formatUpdatedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const date = d.toLocaleDateString("vi-VN",  { day: "2-digit", month: "2-digit" });
    return `${time}, ${date}`;
  } catch {
    return iso;
  }
}

function mapCoffeeRow(row: PriceRow): LocalCoffeePrice {
  const meta = PROVINCE_META[row.province] ?? { region: "Việt Nam", areas: "" };
  return {
    province:  row.province,
    region:    row.region   ?? meta.region,
    areas:     row.areas    ?? meta.areas,
    price:     row.price,
    change:    row.change,
    updatedAt: formatUpdatedAt(row.updated_at),
    weekHigh:  row.week_high ?? row.price + 1000,
    weekLow:   row.week_low  ?? row.price - 1500,
  };
}

function mapPepperRow(row: PriceRow): PepperPrice {
  return {
    province:  row.province,
    price:     row.price,
    change:    row.change,
    updatedAt: formatUpdatedAt(row.updated_at),
    weekHigh:  row.week_high ?? row.price + 3000,
    weekLow:   row.week_low  ?? row.price - 2000,
  };
}

function mapWorldRow(row: WorldMarketRow): WorldPrice {
  return {
    id:        row.id,
    name:      row.name,
    exchange:  row.exchange,
    ticker:    row.ticker,
    price:     row.price,
    change:    row.change,
    changePct: row.change_pct,
    unit:      row.unit,
    session:   row.session,
    high:      row.high,
    low:       row.low,
    color:     row.id === "arabica" ? "amber" : "emerald",
    icon:      Coffee,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STATIC CHART DATA — dùng cho sparklines & main chart
// Có thể thay bằng query bảng `price_history` sau này
// ─────────────────────────────────────────────────────────────────────────────

const CHART_DATA   = [92500, 93800, 94200, 93600, 95000, 95800, 96200, 95900, 96500, 97000, 96800, 96200, 96000, 96000];
const PEPPER_CHART = [143000, 145000, 147500, 148000, 151000, 153000, 152000, 151500, 150000, 151000, 149500, 150000, 151000, 149000];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatVND(v: number) {
  return v.toLocaleString("vi-VN");
}

function formatChange(v: number, unit = "đ") {
  if (v === 0) return "—";
  return (v > 0 ? "+" : "") + v.toLocaleString("vi-VN") + unit;
}

function ChangeIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp  className="w-3.5 h-3.5" />;
  if (value < 0) return <TrendingDown className="w-3.5 h-3.5" />;
  return               <Minus        className="w-3.5 h-3.5" />;
}

function changeBadgeCls(value: number) {
  if (value > 0) return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (value < 0) return "bg-red-50 text-red-600 ring-1 ring-red-200";
  return "bg-slate-100 text-slate-500";
}

function changePriceCls(value: number) {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-red-500";
  return "text-slate-400";
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SKELETON COMPONENTS
// Giữ nguyên layout của cards gốc — chỉ thay nội dung bằng pulse blocks
// ─────────────────────────────────────────────────────────────────────────────

/** Block xương sống tái sử dụng */
function Bone({ className = "" }: { className?: string }) {
  return <div className={`bg-slate-200 animate-pulse rounded-lg ${className}`} />;
}

/** Skeleton WorldCard — giữ đúng kích thước thẻ gốc */
function WorldCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* top stripe */}
      <div className="h-1 bg-slate-200 animate-pulse" />
      <div className="p-6 space-y-4">
        {/* header row */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Bone className="h-3 w-24" />
            <Bone className="h-5 w-36" />
            <Bone className="h-3 w-16" />
          </div>
          <Bone className="h-7 w-16 rounded-xl" />
        </div>
        {/* price */}
        <div className="space-y-2">
          <Bone className="h-10 w-36" />
          <Bone className="h-4  w-24" />
        </div>
        {/* hi/lo grid */}
        <div className="grid grid-cols-2 gap-3">
          <Bone className="h-14 rounded-xl" />
          <Bone className="h-14 rounded-xl" />
        </div>
        {/* sparkline */}
        <Bone className="h-12 w-full" />
        {/* footer */}
        <Bone className="h-4 w-full" />
      </div>
    </div>
  );
}

/** Skeleton LocalCard — dùng cho cả coffee và pepper */
function LocalCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <Bone className="h-2.5 w-20" />
          <Bone className="h-5   w-28" />
          <Bone className="h-2.5 w-36" />
        </div>
        <Bone className="h-6 w-14 rounded-lg" />
      </div>
      <div className="flex items-baseline gap-2">
        <Bone className="h-8 w-32" />
        <Bone className="h-4 w-10" />
      </div>
      <Bone className="h-10 w-full" />
      <Bone className="h-1.5 w-full rounded-full" />
      <div className="flex items-center justify-between pt-1">
        <Bone className="h-3 w-20" />
        <Bone className="h-3 w-3 rounded-full" />
      </div>
    </div>
  );
}

/** Grid skeleton với số cột và số thẻ tuỳ chỉnh */
function LocalGridSkeleton({ cols, count }: { cols: 3 | 4; count: number }) {
  const colClass = cols === 4
    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={`grid ${colClass} gap-4`}>
      {Array.from({ length: count }).map((_, i) => <LocalCardSkeleton key={i} />)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR BANNER
// ─────────────────────────────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 mb-6 text-sm">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-xs font-semibold bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
      >
        <RefreshCw className="w-3 h-3" />
        Thử lại
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENTS — GIỮ NGUYÊN HOÀN TOÀN, chỉ đổi type annotation
// ─────────────────────────────────────────────────────────────────────────────

function Sparkline({ data, color = "#10b981", className = "" }: {
  data:      number[];
  color?:    string;
  className?: string;
}) {
  const W = 200, H = 52;
  const min   = Math.min(...data);
  const max   = Math.max(...data);
  const range = max - min || 1;
  const pts   = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 8) - 4;
    return `${x},${y}`;
  });
  const pathD = "M" + pts.join(" L");
  const areaD = pathD + ` L${W},${H} L0,${H} Z`;
  const last  = data[data.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`w-full ${className}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${color.replace("#", "")})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={(data.length - 1) / (data.length - 1) * W}
        cy={H - ((last - min) / range) * (H - 8) - 4}
        r="3" fill={color} stroke="white" strokeWidth="1.5"
      />
    </svg>
  );
}

function MainChart({ data, color }: { data: number[]; color: string }) {
  const W = 600, H = 160;
  const min   = Math.min(...data) - 500;
  const max   = Math.max(...data) + 500;
  const range = max - min;
  const pts   = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 16) - 8;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pathD  = "M" + pts.join(" L");
  const areaD  = pathD + ` L${W},${H} L0,${H} Z`;
  const labels = ["14 ngày trước", "", "", "", "", "", "7 ngày trước", "", "", "", "", "", "", "Hôm nay"];

  return (
    <div className="relative">
      <div className="absolute left-0 top-0 bottom-6 w-16 flex flex-col justify-between items-end pr-2 pointer-events-none">
        {[max, min + range * 0.66, min + range * 0.33, min].map((v, i) => (
          <span key={i} className="text-[10px] text-slate-400 font-mono leading-none">
            {Math.round(v / 1000)}k
          </span>
        ))}
      </div>
      <div className="ml-16">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="main-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f, i) => (
            <line key={i} x1="0" y1={H * f} x2={W} y2={H * f} stroke="#f1f5f9" strokeWidth="1" />
          ))}
          <path d={areaD} fill="url(#main-area)" />
          <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {data.map((v, i) => {
            const x = (i / (data.length - 1)) * W;
            const y = H - ((v - min) / range) * (H - 16) - 8;
            return i % 3 === 0
              ? <circle key={i} cx={x} cy={y} r="2.5" fill={color} opacity="0.6" />
              : null;
          })}
        </svg>
        <div className="flex justify-between pt-2">
          {labels.map((l, i) => (
            <span key={i} className="text-[10px] text-slate-400 leading-none">{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Ticker() {
  const items = [
    "☕ Đắk Lắk · 96,000đ · —",
    "☕ Gia Lai · 96,000đ · —",
    "☕ Lâm Đồng · 95,300đ · ▼ -200",
    "🌶️ Bình Phước · 149,000đ · ▼ -2,000",
    "🌍 Robusta London · 3,699 USD/tấn",
    "🌍 Arabica NY · 284.60 ¢/lb · ▲ +1.45",
    "🌶️ Đắk Lắk tiêu · 148,500đ · ▼ -1,500",
    "☕ Đắk Nông · 96,000đ · —",
  ];
  return (
    <div className="bg-stone-900 overflow-hidden h-8 flex items-center border-b border-amber-700/30">
      <div className="flex-shrink-0 bg-amber-600 text-white text-[10px] font-bold tracking-widest uppercase px-3 h-full flex items-center gap-1.5 z-10">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-200 animate-pulse" />
        GIÁ NHANH
      </div>
      <div className="overflow-hidden flex-1 relative">
        <div className="flex gap-0 whitespace-nowrap" style={{ animation: "ticker 40s linear infinite" }}>
          {[...items, ...items].map((item, i) => (
            <span key={i} className="text-stone-300 text-[11.5px] font-medium px-5 border-r border-stone-700/50">
              {item}
            </span>
          ))}
        </div>
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}

// Đổi type: (typeof WORLD_PRICES)[0]  →  WorldPrice
function WorldCard({ data }: { data: WorldPrice }) {
  const isUp   = data.change > 0;
  const isDown = data.change < 0;
  const accent =
    isUp   ? "from-emerald-500 to-teal-600"  :
    isDown ? "from-red-500 to-rose-600"       :
             "from-slate-400 to-slate-500";
  const priceColor =
    isUp   ? "text-emerald-600" :
    isDown ? "text-red-500"     :
             "text-slate-700";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className={`h-1 bg-gradient-to-r ${accent}`} />
      <div className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-400 tracking-widest uppercase">
                {data.exchange}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 leading-tight">Cà phê {data.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{data.ticker}</p>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold ${changeBadgeCls(data.change)}`}>
            <ChangeIcon value={data.change} />
            {isUp ? "+" : ""}{data.changePct.toFixed(2)}%
          </div>
        </div>

        <div className="mb-4">
          <div className={`text-4xl font-bold tracking-tight leading-none ${priceColor}`}>
            {data.id === "arabica" ? data.price.toFixed(2) : data.price.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-sm text-slate-400">{data.unit}</span>
            <span className={`text-sm font-semibold ${changePriceCls(data.change)}`}>
              {data.change > 0 ? "▲" : data.change < 0 ? "▼" : "—"}{" "}
              {Math.abs(data.change).toFixed(data.id === "arabica" ? 2 : 0)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-50 rounded-xl px-3 py-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Cao nhất</p>
            <p className="text-sm font-bold text-emerald-600 font-mono">{data.high.toFixed(data.id === "arabica" ? 1 : 0)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl px-3 py-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Thấp nhất</p>
            <p className="text-sm font-bold text-red-500 font-mono">{data.low.toFixed(data.id === "arabica" ? 1 : 0)}</p>
          </div>
        </div>

        <Sparkline
          data={data.id === "robusta" ? CHART_DATA.map((v) => v / 26) : CHART_DATA.map((v) => v / 330)}
          color={isDown ? "#ef4444" : "#10b981"}
          className="h-12"
        />

        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-50">
          <Clock className="w-3 h-3 text-slate-300" />
          <span className="text-[10.5px] text-slate-400">Giờ GD: {data.session} (giờ VN)</span>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            chậm 10 phút
          </span>
        </div>
      </div>
    </div>
  );
}

// Đổi type: (typeof LOCAL_COFFEE_PRICES)[0]  →  LocalCoffeePrice
function LocalCoffeeCard({ data, index }: { data: LocalCoffeePrice; index: number }) {
  const isDown     = data.change < 0;
  const isUp       = data.change > 0;
  const sparkData  = CHART_DATA.map((v, i) => v + (index * 300 - 900) + (i % 3 === 0 ? -100 : 100));
  const sparkColor = isDown ? "#ef4444" : isUp ? "#10b981" : "#94a3b8";

  return (
    <div
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <MapPin className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">{data.region}</span>
          </div>
          <h4 className="font-bold text-slate-800 text-base leading-tight group-hover:text-amber-700 transition-colors">
            {data.province}
          </h4>
          <p className="text-[10.5px] text-slate-400 mt-0.5 leading-tight">{data.areas}</p>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold ${changeBadgeCls(data.change)}`}>
          <ChangeIcon value={data.change} />
          {formatChange(data.change)}
        </div>
      </div>

      <div className="mb-3">
        <span className="text-3xl font-bold text-slate-900 tracking-tight leading-none">{formatVND(data.price)}</span>
        <span className="text-sm text-slate-400 ml-1.5">đ/kg</span>
      </div>

      <Sparkline data={sparkData} color={sparkColor} className="h-10 mb-3" />

      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-400 to-emerald-400 rounded-full"
            style={{
              marginLeft: `${((data.price - data.weekLow) / (data.weekHigh - data.weekLow)) * 60}%`,
              width: "8px",
            }}
          />
        </div>
        <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
          {formatVND(data.weekLow)} – {formatVND(data.weekHigh)}
        </span>
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-slate-50">
        <div className="flex items-center gap-1 text-[10.5px] text-slate-400">
          <Clock className="w-3 h-3" />
          {data.updatedAt}
        </div>
        <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-500 transition-colors" />
      </div>
    </div>
  );
}

// Đổi type: (typeof LOCAL_PEPPER_PRICES)[0]  →  PepperPrice
function PepperCard({ data, index }: { data: PepperPrice; index: number }) {
  const sparkColor = "#a855f7";
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Flame className="w-3 h-3 text-purple-400" />
            <span className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider">Hồ tiêu</span>
          </div>
          <h4 className="font-bold text-slate-800 text-base leading-tight group-hover:text-purple-700 transition-colors">
            {data.province}
          </h4>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold ${changeBadgeCls(data.change)}`}>
          <ChangeIcon value={data.change} />
          {formatChange(data.change)}
        </div>
      </div>
      <div className="mb-3">
        <span className="text-3xl font-bold text-slate-900 tracking-tight leading-none">{formatVND(data.price)}</span>
        <span className="text-sm text-slate-400 ml-1.5">đ/kg</span>
      </div>
      <Sparkline
        data={PEPPER_CHART.map((v, i) => v + (index * 200 - 400) + (i % 4 === 0 ? -100 : 80))}
        color={sparkColor}
        className="h-10 mb-3"
      />
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-50">
        <div className="flex items-center gap-1 text-[10.5px] text-slate-400">
          <Clock className="w-3 h-3" />
          {data.updatedAt}
        </div>
        <span className="text-[10.5px] font-mono text-slate-400">
          {formatVND(data.weekLow)} – {formatVND(data.weekHigh)}
        </span>
      </div>
    </div>
  );
}

function ChartSection() {
  const [active, setActive] = useState<"coffee" | "pepper">("coffee");
  const data        = active === "coffee" ? CHART_DATA   : PEPPER_CHART;
  const color       = active === "coffee" ? "#d97706"    : "#a855f7";
  const last        = data[data.length - 1];
  const first       = data[0];
  const totalChange = last - first;
  const totalPct    = ((totalChange / first) * 100).toFixed(1);

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Xu hướng giá 14 ngày</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {active === "coffee" ? "Cà phê nhân xô Đắk Lắk (đ/kg)" : "Hồ tiêu đen Bình Phước (đ/kg)"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {(["coffee", "pepper"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  active === tab
                    ? tab === "coffee" ? "bg-white shadow-sm text-amber-700" : "bg-white shadow-sm text-purple-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab === "coffee" ? <Coffee className="w-3 h-3" /> : <Flame className="w-3 h-3" />}
                {tab === "coffee" ? "Cà phê" : "Hồ tiêu"}
              </button>
            ))}
          </div>
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold ${changeBadgeCls(totalChange)}`}>
            <ChangeIcon value={totalChange} />
            {totalChange > 0 ? "+" : ""}{formatVND(totalChange)} ({totalPct}%)
          </div>
        </div>
      </div>

      <MainChart data={data} color={color} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-50">
        {[
          { label: "Hiện tại",  value: formatVND(last)              + "đ", cls: "text-slate-800"  },
          { label: "Thấp nhất", value: formatVND(Math.min(...data)) + "đ", cls: "text-red-500"    },
          { label: "Cao nhất",  value: formatVND(Math.max(...data)) + "đ", cls: "text-emerald-600"},
          { label: "Biến động", value: (totalChange > 0 ? "+" : "") + formatVND(totalChange) + "đ", cls: changePriceCls(totalChange) },
        ].map((s) => (
          <div key={s.label} className="bg-slate-50 rounded-xl px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{s.label}</p>
            <p className={`text-sm font-bold font-mono ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const NEWS = [
  { cat: "Cà phê",   color: "text-amber-600",  bg: "bg-amber-50",  title: "Robusta ổn định 3,699 USD/tấn — thị trường chờ tín hiệu từ Tây Nguyên",  date: "02/03/2026", icon: Coffee },
  { cat: "Hồ tiêu",  color: "text-purple-600", bg: "bg-purple-50", title: "Giá tiêu giảm 2,000đ/kg — xuất khẩu chậm lại do tỷ giá biến động",        date: "01/03/2026", icon: Flame  },
  { cat: "Thế giới", color: "text-blue-600",   bg: "bg-blue-50",   title: "Brazil xuất khẩu cà phê đạt kỷ lục 15.6 tỷ USD năm 2025",                 date: "28/02/2026", icon: Globe  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2–3–4. PAGE COMPONENT — nơi duy nhất thay đổi logic
// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {

  // ── UI state (giữ nguyên từ bản cũ) ────────────────────────────────────────
  const [lastUpdated,  setLastUpdated]  = useState("—");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab,    setActiveTab]    = useState<"coffee" | "pepper">("coffee");
  const [currentTime,  setCurrentTime]  = useState("");

  // ── 2. Data state — thay thế hằng số mock ──────────────────────────────────
  const [worldPrices,  setWorldPrices]  = useState<WorldPrice[]>([]);
  const [coffeePrices, setCoffeePrices] = useState<LocalCoffeePrice[]>([]);
  const [pepperPrices, setPepperPrices] = useState<PepperPrice[]>([]);

  // ── 4. Loading & error state ───────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  // ── Clock ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () =>
      setCurrentTime(
        new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── 3. fetchPrices — query song song 2 bảng ────────────────────────────────
  const fetchPrices = useCallback(async () => {
    setError(null);

    try {
      // Chạy song song, không chờ tuần tự
      const [pricesRes, worldRes] = await Promise.all([

        supabase
          .from("prices")
          .select("province, price, change, updated_at, type, region, areas, week_high, week_low")
          .in("type", ["coffee", "pepper"])  // lọc đúng loại, tránh thừa dữ liệu
          .order("province", { ascending: true }),

        supabase
          .from("world_market")
          .select("id, name, exchange, ticker, price, change, change_pct, unit, session, high, low")
          .order("id", { ascending: true }),

      ]);

      // Ném lỗi để xuống catch nếu Supabase trả về lỗi
      if (pricesRes.error) throw new Error(`[prices] ${pricesRes.error.message}`);
      if (worldRes.error)  throw new Error(`[world_market] ${worldRes.error.message}`);

      const rows: PriceRow[]        = pricesRes.data ?? [];
      const worldRows: WorldMarketRow[] = worldRes.data ?? [];

      // Tách coffee / pepper rồi map sang prop types
      setCoffeePrices(rows.filter((r) => r.type === "coffee").map(mapCoffeeRow));
      setPepperPrices(rows.filter((r) => r.type === "pepper").map(mapPepperRow));
      setWorldPrices(worldRows.map(mapWorldRow));

      // Cập nhật timestamp
      const n = new Date();
      setLastUpdated(
        n.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) +
        ", " +
        n.toLocaleDateString("vi-VN",  { day: "2-digit", month: "2-digit", year: "numeric" })
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định.";
      setError(`Không thể tải dữ liệu: ${msg}`);
      console.error("[fetchPrices]", err);
    } finally {
      // Dù thành công hay thất bại, tắt skeleton
      setIsLoading(false);
    }
  }, []);

  // Chạy một lần khi mount
  useEffect(() => { fetchPrices(); }, [fetchPrices]);
  // Realtime — tự cập nhật khi có thay đổi trong database
useEffect(() => {
  const channel = supabase
    .channel("db-price-changes")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "prices" },
      () => fetchPrices()
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "world_market" },
      () => fetchPrices()
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [fetchPrices]);

  // Nút "Cập nhật giá" — bật skeleton lại, fetch mới
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setIsLoading(true);
    await fetchPrices();
    setIsRefreshing(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — layout giữ nguyên, chỉ thay const → state và thêm skeleton
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      <Ticker />

      {/* ── HEADER ── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-sm">
              <Coffee className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm leading-none">
                Giá Cà Phê <span className="text-amber-600">&amp; Tiêu</span>
              </div>
              <div className="text-[9.5px] text-slate-400 tracking-wide leading-none mt-0.5">GIACACAPHE.VN</div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            {["Bảng giá", "Cà phê", "Hồ tiêu", "Công cụ", "Tin tức"].map((item, i) => (
              <a
                key={item} href="#"
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  i === 0 ? "bg-amber-50 text-amber-700" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              {currentTime}
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-sm shadow-amber-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Cập nhật giá</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* ── PAGE TITLE ── */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-7">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
              Giá cà phê &amp; hồ tiêu hôm nay
            </h1>
            <p className="text-slate-400 text-sm mt-1 flex items-center gap-2 flex-wrap">
              <Clock className="w-3.5 h-3.5" />
              Cập nhật lần cuối:{" "}
              <strong className="text-slate-600">
                {isLoading ? "Đang tải..." : lastUpdated}
              </strong>
              <span className="text-slate-200">·</span>
              <span className="text-xs">Giá sàn quốc tế chậm 10 phút</span>
            </p>
          </div>
          <div>
            {/* Badge trạng thái — đổi theo isLoading */}
            {isLoading ? (
              <span className="text-xs bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full font-medium ring-1 ring-amber-200 flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Đang tải dữ liệu...
              </span>
            ) : (
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium ring-1 ring-emerald-200">
                ● Đang cập nhật
              </span>
            )}
          </div>
        </div>

        {/* ── ERROR BANNER — chỉ hiện khi có lỗi ── */}
        {error && <ErrorBanner message={error} onRetry={handleRefresh} />}

        {/* ── HERO — Giá sàn thế giới ── */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Giá sàn thế giới</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Skeleton khi đang load, card thật khi có data */}
            {isLoading
              ? Array.from({ length: 2 }).map((_, i) => <WorldCardSkeleton key={i} />)
              : worldPrices.map((p) => <WorldCard key={p.id} data={p} />)
            }
          </div>
        </section>

        {/* ── CHART — dùng data tĩnh, không thay đổi ── */}
        <ChartSection />

        {/* ── LOCAL PRICES ── */}
        <section className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Giá trong nước</h2>
            </div>
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setActiveTab("coffee")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "coffee" ? "bg-white shadow-sm text-amber-700" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                Cà phê
                {/* Đếm từ state thay vì hằng số */}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === "coffee" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-500"
                }`}>
                  {isLoading ? "—" : coffeePrices.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("pepper")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "pepper" ? "bg-white shadow-sm text-purple-700" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                Hồ tiêu
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === "pepper" ? "bg-purple-100 text-purple-700" : "bg-slate-200 text-slate-500"
                }`}>
                  {isLoading ? "—" : pepperPrices.length}
                </span>
              </button>
            </div>
          </div>

          {/* Coffee: skeleton 6 thẻ → 3 cột khi load xong */}
          {activeTab === "coffee" && (
            isLoading
              ? <LocalGridSkeleton cols={3} count={6} />
              : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {coffeePrices.map((p, i) => (
                    <LocalCoffeeCard key={p.province} data={p} index={i} />
                  ))}
                </div>
              )
          )}

          {/* Pepper: skeleton 4 thẻ → 4 cột khi load xong */}
          {activeTab === "pepper" && (
            isLoading
              ? <LocalGridSkeleton cols={4} count={4} />
              : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {pepperPrices.map((p, i) => (
                    <PepperCard key={p.province} data={p} index={i} />
                  ))}
                </div>
              )
          )}
        </section>

        {/* ── NEWS ── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Tin tức mới nhất</h2>
            </div>
            <a href="#" className="text-xs text-amber-600 hover:underline font-medium">Xem thêm →</a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {NEWS.map((n) => {
              const Icon = n.icon;
              return (
                <a
                  key={n.title} href="#"
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold mb-3 ${n.bg} ${n.color}`}>
                    <Icon className="w-3 h-3" />{n.cat}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-700 leading-snug group-hover:text-slate-900 transition-colors line-clamp-3">
                    {n.title}
                  </h3>
                  <div className="flex items-center gap-1 mt-3 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />{n.date}
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* ── DISCLAIMER ── */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 text-xs text-amber-700 flex items-start gap-2">
          <span className="text-base leading-none flex-shrink-0">ℹ️</span>
          <span>
            Giá được tính toán dựa trên giá sàn thế giới kết hợp khảo sát thực tế từ các doanh nghiệp, đại lý thu mua tại các vùng trọng điểm.
            Dữ liệu sàn quốc tế chậm 10 phút. Chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.
          </span>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-100 bg-white mt-12 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
              <Coffee className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-slate-600">GiaCaCaphe.vn</span>
            <span>© 2024–2026</span>
          </div>
          <div className="flex items-center gap-5">
            {["Giá cà phê", "Giá hồ tiêu", "Công cụ", "Liên hệ"].map((l) => (
              <a key={l} href="#" className="hover:text-slate-700 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
}
