"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { setAuthSession } from "@/lib/auth-session";
import { getCloudApiBase, loginTelaflowCloud } from "@/lib/cloud-api";

function formatLoginError(err: unknown): string {
  if (err instanceof Error) {
    if (err.message === "missing_api_url") {
      return "Configure NEXT_PUBLIC_CLOUD_API_URL apontando para a Cloud API.";
    }
    if (err.message === "jwt_not_configured") {
      return "O servidor não tem login JWT ativo (TELAFLOW_JWT_SECRET). Use o modo desenvolvimento sem Bearer ou configure o segredo na API.";
    }
    if (err.message.startsWith("login_failed:")) {
      const cause = err.cause;
      const detail =
        cause != null && typeof cause === "object" && "detail" in cause
          ? (cause as { detail?: { message?: string; error?: string } }).detail
          : null;
      if (detail?.message) return detail.message;
      return "Não foi possível entrar. Verifique e-mail e senha.";
    }
  }
  return "Algo deu errado. Tente de novo.";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = useId();
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiConfigured = getCloudApiBase() !== null;
  const returnTo = searchParams.get("returnTo")?.trim() || "/events";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!apiConfigured) {
      setError(formatLoginError(new Error("missing_api_url")));
      return;
    }
    setSubmitting(true);
    try {
      const data = await loginTelaflowCloud(email.trim(), password);
      setAuthSession(data.access_token, data.organization_id);
      router.replace(returnTo.startsWith("/") ? returnTo : "/events");
    } catch (err) {
      setError(formatLoginError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen text-tf-muted">
      <AppHeader />
      <main
        id="conteudo-principal"
        className="mx-auto min-w-0 max-w-md px-4 pb-16 pt-10 sm:px-6 sm:pt-12"
      >
        <h1 className="font-display text-2xl font-semibold tracking-tight text-tf-fg sm:text-3xl">
          Entrar
        </h1>
        <form
          onSubmit={(ev) => void onSubmit(ev)}
          className="mt-8 space-y-5 rounded-tf-lg border border-tf-border bg-tf-mid/40 p-5 sm:p-6"
        >
          <div>
            <label htmlFor={emailId} className="block text-sm font-medium text-tf-muted">
              E-mail
            </label>
            <input
              id={emailId}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
              className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg outline-none ring-tf-accent/40 focus:border-tf-accent/50 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor={passwordId} className="block text-sm font-medium text-tf-muted">
              Senha
            </label>
            <input
              id={passwordId}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
              className="mt-2 w-full rounded-tf border border-tf-border bg-tf-bg px-3 py-2 text-tf-fg outline-none ring-tf-accent/40 focus:border-tf-accent/50 focus:ring-2"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-300/90" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/"
              className="inline-flex justify-center rounded-tf border border-tf-border px-4 py-2 text-center text-sm font-medium text-tf-muted transition-colors hover:border-tf-border hover:text-tf-fg sm:order-first sm:mr-auto"
            >
              Voltar
            </Link>
            <button
              type="submit"
              disabled={submitting || !apiConfigured}
              className="rounded-tf bg-tf-accent px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Entrando…" : "Entrar"}
            </button>
          </div>
        </form>
      </main>
      <AppFooter />
    </div>
  );
}
