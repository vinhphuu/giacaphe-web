export interface PriceRow {
  id:           number;
  province:     string;
  region:       string;
  areas:        string | null;
  price:        number;
  change:       number | null;
  change_value: number | null;
  updated_at:   string | null;
  type:         "coffee" | "pepper";
  week_high:    number | null;
  week_low:     number | null;
}

export interface PriceHistoryRow {
  id:          number;
  province:    string;
  price:       number;
  recorded_at: string;
  type:        "coffee" | "pepper";
}

export interface PriceCardData {
  province:    string;
  region:      string;
  price:       number;
  changeValue: number;
  updatedAt:   string;
  weekHigh:    number;
  weekLow:     number;
}

export interface ChartDataPoint {
  date:  string;
  price: number;
}

export interface FetchResult<T> {
  data:  T | null;
  error: string | null;
}
