/**
 * lib/region-utils.ts
 * Mapping slug <-> tên tỉnh, tỉnh lân cận, ảnh OG
 */

export interface RegionInfo {
  province:  string;   // "Đắk Lắk"
  slug:      string;   // "dak-lak"
  neighbors: string[]; // slug các tỉnh lân cận
  ogImage:   string;   // URL ảnh OG
  highlight: string;   // đặc điểm thu mua nổi bật
}

export const REGIONS: RegionInfo[] = [
  {
    province:  "Đắk Lắk",
    slug:      "dak-lak",
    neighbors: ["gia-lai", "dak-nong", "lam-dong"],
    ogImage:   "https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=1200&q=80",
    highlight: "thủ phủ cà phê Việt Nam, tập trung tại các huyện Cư M'gar, Krông Ana, Ea H'leo",
  },
  {
    province:  "Gia Lai",
    slug:      "gia-lai",
    neighbors: ["dak-lak", "kon-tum", "dak-nong"],
    ogImage:   "https://images.unsplash.com/photo-1504627298434-2922d734408c?w=1200&q=80",
    highlight: "vùng trọng điểm Robusta phía Bắc Tây Nguyên, tập trung tại Chư Sê, Ia Grai, Chư Pưh",
  },
  {
    province:  "Lâm Đồng",
    slug:      "lam-dong",
    neighbors: ["dak-lak", "dak-nong", "gia-lai"],
    ogImage:   "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1200&q=80",
    highlight: "vùng Arabica và Robusta chất lượng cao, tập trung tại Di Linh, Bảo Lộc, Lâm Hà",
  },
  {
    province:  "Đắk Nông",
    slug:      "dak-nong",
    neighbors: ["dak-lak", "gia-lai", "lam-dong"],
    ogImage:   "https://images.unsplash.com/photo-1495774856032-8b90bbb32b32?w=1200&q=80",
    highlight: "vùng sản xuất mới nổi, tập trung tại Đắk Mil, Đắk Song, Cư Jút",
  },
  {
    province:  "Kon Tum",
    slug:      "kon-tum",
    neighbors: ["gia-lai", "dak-lak"],
    ogImage:   "https://images.unsplash.com/photo-1511537190424-bbbab87ac5eb?w=1200&q=80",
    highlight: "vùng cà phê diện tích nhỏ nhưng chất lượng cao, tập trung tại Đắk Hà, Ngọc Hồi",
  },
];

export function slugToProvince(slug: string): string | null {
  return REGIONS.find(r => r.slug === slug)?.province ?? null;
}

export function provinceToSlug(province: string): string | null {
  return REGIONS.find(r => r.province === province)?.slug ?? null;
}

export function getRegionInfo(slug: string): RegionInfo | null {
  return REGIONS.find(r => r.slug === slug) ?? null;
}

export function getNeighborRegions(slug: string): RegionInfo[] {
  const region = getRegionInfo(slug);
  if (!region) return [];
  return region.neighbors
    .map(s => getRegionInfo(s))
    .filter((r): r is RegionInfo => r !== null);
}

/** Parse date từ slug "05-03-2026" -> Date object */
export function parseDateSlug(dateSlug: string): Date | null {
  const parts = dateSlug.split("-");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00+07:00`);
  return isNaN(d.getTime()) ? null : d;
}

/** Format date slug "05-03-2026" -> "05/03/2026" */
export function formatDateSlug(dateSlug: string): string {
  return dateSlug.replace(/-/g, "/");
}

/** Tạo date slug từ Date object */
export function toDateSlug(date: Date): string {
  const d = new Date(date.toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }));
  const dd   = String(d.getDate()).padStart(2, "0");
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}
