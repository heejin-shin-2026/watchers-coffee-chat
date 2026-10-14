import AdminNav from "@/components/AdminNav";
import ResultPage from "./ResultClient";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="max-w-6xl mx-auto px-5 py-8">
        <ResultPage params={params} />
      </main>
    </div>
  );
}
