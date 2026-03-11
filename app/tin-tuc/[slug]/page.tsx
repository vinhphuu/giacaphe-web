export const dynamic = "force-dynamic";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  console.log("=== ARTICLE PAGE RUNNING, slug:", slug);
  return (
    <main style={{ background: "#0f172a", color: "white", minHeight: "100vh", padding: "2rem" }}>
      <h1>TEST: slug = {slug}</h1>
      <p>Nếu thấy trang này = file đang chạy đúng</p>
    </main>
  );
}
