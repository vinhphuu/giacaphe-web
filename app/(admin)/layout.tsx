/**
 * app/(admin)/layout.tsx
 * Layout riêng cho khu vực admin — tách biệt hoàn toàn với trang chủ
 */

import type { ReactNode } from "react";
import Link               from "next/link";

export const metadata = {
  title:  { template: "%s | Admin GiaCaPhe", default: "Admin GiaCaPhe" },
  robots: { index: false, follow: false }, // Không index trang admin
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
              <span className="text-slate-900 text-sm font-bold">☕</span>
            </div>
            <div>
              <p className="text-white text-xs font-bold leading-none">GiaCaPhe</p>
              <p className="text-slate-500 text-[10px] mt-0.5">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {[
            { href: "/admin",          icon: "📊", label: "Dashboard"    },
            { href: "/admin/articles", icon: "📝", label: "Bài viết"     },
            { href: "/admin/prices",   icon: "💰", label: "Giá cà phê"   },
            { href: "/admin/logs",     icon: "🔍", label: "Crawler Logs" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
                         text-slate-400 hover:text-white hover:bg-slate-800
                         transition-colors duration-150"
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800">
          <Link
            href="/admin/logout"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
                       text-slate-500 hover:text-rose-400 hover:bg-rose-500/10
                       transition-colors duration-150 w-full"
          >
            <span>🚪</span>
            <span>Đăng xuất</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
                       text-slate-500 hover:text-slate-300 hover:bg-slate-800
                       transition-colors duration-150 w-full mt-1"
          >
            <span>🌐</span>
            <span>Xem trang web</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
