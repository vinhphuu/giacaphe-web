/**
 * app/(admin)/admin/login/page.tsx
 * Trang đăng nhập admin — Supabase Auth
 */

"use client";

import { useState }     from "react";
import { useRouter }    from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: authError } = await sb.auth.signInWithPassword({ email, password });

    if (authError) {
      setError("Email hoặc mật khẩu không đúng.");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-slate-900 text-2xl">☕</span>
          </div>
          <h1 className="text-xl font-bold text-white">GiaCaPhe Admin</h1>
          <p className="text-slate-500 text-sm mt-1">Đăng nhập để quản lý hệ thống</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@caphehomnay.com"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5
                         text-sm text-white placeholder-slate-600
                         focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30
                         transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5
                         text-sm text-white placeholder-slate-600
                         focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30
                         transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50
                       text-slate-900 font-bold py-2.5 rounded-xl text-sm
                       transition-colors duration-150 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Đang đăng nhập...
              </>
            ) : "Đăng nhập"}
          </button>
        </form>

        <p className="text-center text-slate-600 text-xs mt-4">
          Chỉ dành cho quản trị viên hệ thống
        </p>
      </div>
    </div>
  );
}
