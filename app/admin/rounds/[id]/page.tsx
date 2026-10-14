import AdminNav from "@/components/AdminNav";
import ApplicantsPage from "./ApplicantsClient";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="max-w-6xl mx-auto px-5 py-8">
        <ApplicantsPage params={params} />
      </main>
    </div>
  );
}
