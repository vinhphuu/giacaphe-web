import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-amber-400 text-sm font-semibold mb-3">404</p>
        <h1 className="text-2xl font-bold text-white mb-3">Không tìm thấy trang</h1>
        <p className="text-slate-400 text-sm mb-8">Bài viết không tồn tại hoặc đã bị xóa.</p>
        <div className="flex gap-4 justify-center">
          <Link href="/tin-tuc" className="text-sm text-amber-400 hover:text-amber-300 transition-colors">
            ← Tất cả bài viết
          </Link>
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-300 transition-colors">
            Trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
