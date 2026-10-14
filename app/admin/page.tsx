import AdminNav from "@/components/AdminNav";
import RoundList from "./RoundList";

export default function AdminHome() {
  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="max-w-6xl mx-auto px-5 py-8">
        <RoundList />
      </main>
    </div>
  );
}
