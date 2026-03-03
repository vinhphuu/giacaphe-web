// ─────────────────────────────────────────────
// DATABASE TYPES — khớp 1:1 với schema Supabase
// ─────────────────────────────────────────────

/** Hàng trong bảng `prices` */
export interface PriceRow {
  id:           number;
  region:       string;          // 'Đắk Lắk' | 'Gia Lai' | ...
  price:        number;          // đ/kg, VD: 96000
  change_value: number;          // chênh lệch so với hôm qua, VD: -200
  updated_at:   string;          // ISO 8601 timestamp
  type:         "coffee" | "pepper";
  week_high?:   number;
  week_low?:    number;
}

/** Hàng trong bảng `price_history` — dùng cho biểu đồ */
export interface PriceHistoryRow {
  id:         number;
  region:     string;
  price:      number;
  recorded_at: string;           // ISO 8601
  type:       "coffee" | "pepper";
}

// ─────────────────────────────────────────────
// VIEW TYPES — dành cho UI components
// ─────────────────────────────────────────────

export interface PriceCardData {
  region:      string;
  price:       number;
  changeValue: number;
  updatedAt:   string;           // đã format, VD: "08:30, 03/03"
  weekHigh:    number;
  weekLow:     number;
}

export interface ChartDataPoint {
  date:  string;                 // "T2", "T3", ...
  price: number;
}

export interface RegionGroup {
  name:   string;
  rows:   PriceCardData[];
}

// ─────────────────────────────────────────────
// API RESPONSE TYPES
// ─────────────────────────────────────────────

export interface FetchResult<T> {
  data:  T | null;
  error: string | null;
}
