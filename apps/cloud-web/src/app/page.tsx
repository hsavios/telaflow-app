import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { OperationalHome } from "@/components/dashboard/OperationalHome";

export default function Home() {
  return (
    <div className="min-h-screen text-tf-muted">
      <AppHeader />
      <OperationalHome />
      <AppFooter />
    </div>
  );
}
