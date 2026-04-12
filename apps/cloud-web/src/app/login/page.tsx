import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-tf-bg text-tf-muted">
          <p className="p-8 text-sm text-tf-subtle">Carregando…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
