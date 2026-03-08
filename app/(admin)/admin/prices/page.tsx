"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Price = {
  id: string;
  region: string;
  price: number;
  updated_at: string;
};

export default function PricesPage() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    sb.from("coffee_prices")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        setPrices(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Giá cà phê</h1>
      {loading ? (
        <p className="text-slate-400">Đang tải...</p>
      ) : prices.length === 0 ? (
        <p className="text-slate-400">Chưa có dữ liệu giá.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60">
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Tỉnh/Thành</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Giá (đ/kg)</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((p) => (
                <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-3 text-white">{p.region}</td>
                  <td className="px-4 py-3 text-right text-amber-400 font-bold">
                    {p.price.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500 text-xs">
                    {new Date(p.updated_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
